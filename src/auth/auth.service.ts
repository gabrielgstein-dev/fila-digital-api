import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateAgent(email: string, password: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!agent || !agent.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, agent.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, ...result } = agent;
    return result;
  }

  async login(email: string, password: string) {
    const agent = await this.validateAgent(email, password);

    const payload = {
      sub: agent.id,
      email: agent.email,
      role: agent.role,
      tenantId: agent.tenantId,
      userType: 'agent',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: agent,
      userType: 'agent',
    };
  }

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    // Primeiro, verificar se é um agente existente
    const existingAgent = await this.prisma.agent.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
      include: { tenant: true },
    });

    if (existingAgent) {
      // Atualizar googleId se não tiver
      if (!existingAgent.googleId) {
        await this.prisma.agent.update({
          where: { id: existingAgent.id },
          data: { googleId: googleUser.googleId },
        });
      }

      return {
        id: existingAgent.id,
        email: existingAgent.email,
        name: existingAgent.name,
        role: existingAgent.role,
        tenantId: existingAgent.tenantId,
        tenant: existingAgent.tenant,
        userType: 'agent',
      };
    }

    // Se não é agente, verificar se é usuário cliente existente
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
    });

    if (!user) {
      // Criar novo usuário cliente
      user = await this.prisma.user.create({
        data: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        },
      });
    } else {
      // Atualizar dados se necessário
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          name: googleUser.name,
          picture: googleUser.picture,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      phone: user.phone,
      userType: 'client',
    };
  }

  async googleLogin(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      ...(user.userType === 'agent' && {
        role: user.role,
        tenantId: user.tenantId,
      }),
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
      userType: user.userType,
    };
  }
}
