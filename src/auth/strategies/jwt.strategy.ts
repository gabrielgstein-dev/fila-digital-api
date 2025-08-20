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
    // Verificar se é agente ou cliente
    if (payload.userType === 'agent') {
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
        role: agent.role,
        tenantId: agent.tenantId,
        tenant: agent.tenant,
        userType: 'agent',
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
        picture: user.picture,
        phone: user.phone,
        userType: 'client',
      };
    }

    throw new UnauthorizedException('Tipo de usuário inválido');
  }
}
