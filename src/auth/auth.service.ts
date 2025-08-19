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
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: agent,
    };
  }
}
