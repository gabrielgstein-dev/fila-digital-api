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
    };
  }
}
