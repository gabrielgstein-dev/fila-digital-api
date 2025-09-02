import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Verificar se é usuário corporativo, agente ou cliente
    if (payload.userType === 'corporate_user') {
      const corporateUser = await this.prisma.corporateUser.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!corporateUser || !corporateUser.isActive) {
        throw new UnauthorizedException();
      }

      return {
        id: corporateUser.id,
        email: corporateUser.email,
        name: corporateUser.name,
        role: corporateUser.role,
        tenantId: corporateUser.tenantId,
        userType: 'corporate_user',
        tenant: corporateUser.tenant,
      };
    } else if (payload.userType === 'agent') {
      const agent = await this.prisma.agent.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!agent || !agent.isActive) {
        throw new UnauthorizedException();
      }

      return {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        role: agent.role,
        tenantId: agent.tenantId,
        userType: 'agent',
        tenant: agent.tenant,
      };
    } else if (payload.userType === 'client') {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: 'client',
      };
    }

    throw new UnauthorizedException('Tipo de usuário inválido');
  }
}
