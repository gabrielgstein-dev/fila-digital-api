# 💳 Exemplo de Implementação - Sistema de Assinaturas

## 📝 1. Atualizar CreateTenantDto

```typescript
// src/common/dto/create-tenant.dto.ts

import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Slug único da empresa' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ description: 'Email da empresa' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone da empresa' })
  @IsOptional()
  @IsString()
  phone?: string;

  // NOVOS CAMPOS PARA ASSINATURA
  @ApiPropertyOptional({ 
    description: 'Slug do plano de assinatura (free, basic, professional, enterprise)',
    default: 'free'
  })
  @IsOptional()
  @IsString()
  planSlug?: string;

  @ApiPropertyOptional({ 
    description: 'Dias de trial (apenas se plano permitir)',
    default: 14,
    minimum: 0,
    maximum: 90
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Email para cobrança' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'CPF/CNPJ para cobrança' })
  @IsOptional()
  @IsString()
  billingDocument?: string;
}
```

## 🔧 2. Atualizar TenantsService

```typescript
// src/tenants/tenants.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from '../common/dto/create-tenant.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService, // Novo service
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    // 1. Verificar se slug já existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: createTenantDto.slug },
    });

    if (existingTenant) {
      throw new ConflictException('Slug já existe');
    }

    // 2. Buscar ou usar plano padrão
    const planSlug = createTenantDto.planSlug || 'free';
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { slug: planSlug },
    });

    if (!plan) {
      throw new NotFoundException(`Plano "${planSlug}" não encontrado`);
    }

    // 3. Criar tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        slug: createTenantDto.slug,
        email: createTenantDto.email,
        phone: createTenantDto.phone,
        billingEmail: createTenantDto.billingEmail,
        billingDocument: createTenantDto.billingDocument,
      },
    });

    // 4. Criar assinatura automaticamente
    const subscription = await this.subscriptionService.createSubscription({
      tenantId: tenant.id,
      planId: plan.id,
      trialDays: createTenantDto.trialDays || plan.trialDays,
      billingEmail: createTenantDto.billingEmail || createTenantDto.email,
    });

    // 5. Atualizar tenant com subscriptionId
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trialEndDate,
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    return updatedTenant;
  }

  // ... outros métodos
}
```

## 🎯 3. Criar SubscriptionService

```typescript
// src/subscriptions/subscriptions.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

interface CreateSubscriptionDto {
  tenantId: string;
  planId: string;
  trialDays?: number;
  billingEmail?: string;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async createSubscription(dto: CreateSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const now = new Date();
    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    let trialEndDate: Date | null = null;

    // Se plano permite trial e trialDays foi informado
    if (plan.isTrialable && dto.trialDays && dto.trialDays > 0) {
      status = SubscriptionStatus.TRIAL;
      trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + dto.trialDays);
    } else if (plan.price === 0) {
      // Plano gratuito sempre ACTIVE
      status = SubscriptionStatus.ACTIVE;
    }

    // Calcular período atual
    const currentPeriodStart = now;
    const currentPeriodEnd = new Date(now);
    
    if (plan.billingCycle === 'MONTHLY') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        status,
        startDate: now,
        trialEndDate,
        currentPeriodStart,
        currentPeriodEnd,
        autoRenew: plan.price > 0,
      },
    });

    // Criar histórico
    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        tenantId: dto.tenantId,
        action: 'CREATED',
        toPlanId: dto.planId,
        metadata: {
          trialDays: dto.trialDays,
          billingEmail: dto.billingEmail,
        },
      },
    });

    return subscription;
  }

  async getCurrentLimits(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    return subscription.plan.limits as Record<string, any>;
  }

  async checkLimit(tenantId: string, limitType: string, currentCount: number): Promise<boolean> {
    const limits = await this.getCurrentLimits(tenantId);
    const limit = limits[limitType];

    // -1 significa ilimitado
    if (limit === -1) {
      return true;
    }

    return currentCount < limit;
  }

  async canUseFeature(tenantId: string, feature: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return false;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    return features[feature] === true;
  }
}
```

## 🛡️ 4. Criar Guard de Limites

```typescript
// src/subscriptions/guards/subscription-limits.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../subscriptions.service';

@Injectable()
export class SubscriptionLimitsGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.params?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID não encontrado');
    }

    // Exemplo: verificar limite de filas
    const queueCount = await this.getQueueCount(tenantId);
    const canCreate = await this.subscriptionService.checkLimit(
      tenantId,
      'maxQueues',
      queueCount,
    );

    if (!canCreate) {
      throw new ForbiddenException(
        'Limite de filas atingido. Faça upgrade do seu plano.',
      );
    }

    return true;
  }

  private async getQueueCount(tenantId: string): Promise<number> {
    // Implementar contagem de filas
    // return await this.prisma.queue.count({ where: { tenantId } });
    return 0;
  }
}
```

## 📊 5. Usar Guard nos Endpoints

```typescript
// src/queues/queues.controller.ts

import { UseGuards } from '@nestjs/common';
import { SubscriptionLimitsGuard } from '../subscriptions/guards/subscription-limits.guard';

@Controller()
export class QueuesController {
  @Post('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard, SubscriptionLimitsGuard) // Adicionar guard
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateQueueDto) {
    // Só executa se não exceder limite
    return this.queuesService.create(tenantId, dto);
  }
}
```

## 🔄 6. Atualizar Endpoint de Criação no Postman

```json
{
  "name": "Criar Empresa com Plano",
  "request": {
    "method": "POST",
    "body": {
      "mode": "raw",
      "raw": "{\n    \"name\": \"Minha Empresa\",\n    \"slug\": \"minha-empresa\",\n    \"email\": \"contato@minhaempresa.com\",\n    \"phone\": \"(11) 99999-9999\",\n    \"planSlug\": \"basic\",\n    \"trialDays\": 14,\n    \"billingEmail\": \"financeiro@minhaempresa.com\"\n}"
    }
  }
}
```

## ✅ Checklist de Implementação

- [ ] Adicionar modelos ao schema.prisma
- [ ] Criar migration: `npx prisma migrate dev --name add_subscription_system`
- [ ] Executar seed de planos: `node scripts/seed-subscription-plans.js`
- [ ] Criar SubscriptionService
- [ ] Atualizar CreateTenantDto
- [ ] Atualizar TenantsService.create()
- [ ] Criar SubscriptionLimitsGuard
- [ ] Adicionar guards aos endpoints críticos
- [ ] Criar endpoints de gestão de assinaturas
- [ ] Atualizar coleção Postman
- [ ] Criar jobs para verificar expirações
- [ ] Implementar notificações de trial/expiração

