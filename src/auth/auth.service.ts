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

  async validateAgent(cpf: string, password: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { cpf },
      include: { tenant: true },
    });

    if (!agent || !agent.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!agent.password) {
      throw new UnauthorizedException('Conta não possui senha configurada');
    }

    const isPasswordValid = await bcrypt.compare(password, agent.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = agent;
    return result;
  }

  async login(cpf: string, password: string) {
    const agent = await this.validateAgent(cpf, password);

    const payload = {
      sub: agent.id,
      email: agent.email,
      cpf: agent.cpf,
      role: agent.role,
      tenantId: agent.tenantId,
      userType: 'agent',
    };

    // Remover propriedades sensíveis antes de retornar
    const {
      password: _,
      isDefault: __,
      isProtected: ___,
      ...cleanAgent
    } = agent as any;

    // Formatar datas
    const formattedAgent = this.formatDates(cleanAgent);

    return {
      access_token: this.jwtService.sign(payload),
      user: formattedAgent,
      userType: 'agent',
    };
  }

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    try {
      // Validações de entrada
      if (!googleUser.googleId || !googleUser.email || !googleUser.name) {
        throw new Error('Dados do usuário Google incompletos');
      }

      // Primeiro, verificar se é um usuário corporativo existente
      const existingCorporateUser = await this.prisma.corporateUser.findFirst({
        where: {
          OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
        },
        include: { tenant: true },
      });

      if (existingCorporateUser) {
        // Atualizar googleId se não tiver
        if (!existingCorporateUser.googleId) {
          await this.prisma.corporateUser.update({
            where: { id: existingCorporateUser.id },
            data: { googleId: googleUser.googleId },
          });
        }

        // Atualizar dados se necessário
        if (
          existingCorporateUser.name !== googleUser.name ||
          existingCorporateUser.email !== googleUser.email
        ) {
          await this.prisma.corporateUser.update({
            where: { id: existingCorporateUser.id },
            data: {
              name: googleUser.name,
              email: googleUser.email,
            },
          });
        }

        return {
          id: existingCorporateUser.id,
          email: existingCorporateUser.email,
          name: existingCorporateUser.name,
          role: existingCorporateUser.role,
          tenantId: existingCorporateUser.tenantId,
          tenant: existingCorporateUser.tenant,
          userType: 'corporate_user',
        };
      }

      // Verificar se é um agente existente
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

        // Atualizar dados se necessário
        if (
          existingAgent.name !== googleUser.name ||
          existingAgent.email !== googleUser.email
        ) {
          await this.prisma.agent.update({
            where: { id: existingAgent.id },
            data: {
              name: googleUser.name,
              email: existingAgent.email,
            },
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

      // Se não é agente nem usuário corporativo, verificar se é usuário cliente existente
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
            isActive: true,
          },
        });
      } else {
        // Atualizar dados se necessário
        const updateData: any = {};
        if (user.googleId !== googleUser.googleId)
          updateData.googleId = googleUser.googleId;
        if (user.name !== googleUser.name) updateData.name = googleUser.name;
        if (user.picture !== googleUser.picture)
          updateData.picture = googleUser.picture;

        if (Object.keys(updateData).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        phone: user.phone,
        userType: 'client',
      };
    } catch (error) {
      console.error('Erro ao validar usuário Google:', error);
      throw new Error(`Falha ao processar usuário Google: ${error.message}`);
    }
  }

  async googleLogin(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      ...((user.userType === 'agent' || user.userType === 'corporate_user') && {
        role: user.role,
        tenantId: user.tenantId,
      }),
    };

    // Remover propriedades sensíveis antes de retornar
    const {
      password: _,
      isDefault: __,
      isProtected: ___,
      ...cleanUser
    } = user as any;

    return {
      access_token: this.jwtService.sign(payload),
      user: cleanUser,
      userType: user.userType,
    };
  }

  async validateGoogleTokenAndLogin(
    googleAccessToken: string,
    googleUser: any,
  ) {
    try {
      // Validações de entrada
      if (!googleAccessToken || !googleUser) {
        throw new UnauthorizedException(
          'Token Google e dados do usuário são obrigatórios',
        );
      }

      if (!googleUser.id || !googleUser.email || !googleUser.name) {
        throw new UnauthorizedException('Dados do usuário Google incompletos');
      }

      // Validar token com Google
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleAccessToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Token Google inválido ou expirado');
      }

      const tokenInfo = await response.json();

      // Verificar se o token é válido e não expirou
      if (!tokenInfo.email || tokenInfo.email !== googleUser.email) {
        throw new UnauthorizedException(
          'Token Google não corresponde ao usuário informado',
        );
      }

      // Verificar se o token não expirou
      if (tokenInfo.expires_in !== undefined && tokenInfo.expires_in <= 0) {
        throw new UnauthorizedException('Token Google expirado');
      }

      // Validar/criar usuário usando os dados do Google
      const user = await this.validateGoogleUser({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      });

      // Gerar JWT da nossa aplicação
      return this.googleLogin(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Erro ao validar token Google:', error);
      throw new UnauthorizedException(
        `Erro ao validar token Google: ${error.message}`,
      );
    }
  }

  async validateCorporateUser(email: string, password: string) {
    const corporateUser = await this.prisma.corporateUser.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!corporateUser || !corporateUser.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!corporateUser.password) {
      throw new UnauthorizedException('Conta não possui senha configurada');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      corporateUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return corporateUser;
  }

  async validateClient(cpf: string, password: string) {
    const client = await this.prisma.user.findUnique({
      where: { cpf },
    });

    if (!client || !client.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!client.password) {
      throw new UnauthorizedException('Conta não possui senha configurada');
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return client;
  }

  private formatDates(obj: any): any {
    if (obj.createdAt && typeof obj.createdAt === 'object') {
      obj.createdAt = obj.createdAt.toISOString
        ? obj.createdAt.toISOString()
        : new Date().toISOString();
    }
    if (obj.updatedAt && typeof obj.updatedAt === 'object') {
      obj.updatedAt = obj.updatedAt.toISOString
        ? obj.updatedAt.toISOString()
        : new Date().toISOString();
    }
    return obj;
  }

  async corporateUserLogin(email: string, password: string) {
    const corporateUser = await this.validateCorporateUser(email, password);

    const payload = {
      sub: corporateUser.id,
      email: corporateUser.email,
      cpf: corporateUser.cpf,
      role: corporateUser.role,
      tenantId: corporateUser.tenantId,
      userType: 'corporate_user',
    };

    // Remover propriedades sensíveis antes de retornar
    const {
      password: _,
      isDefault: __,
      isProtected: ___,
      ...cleanCorporateUser
    } = corporateUser as any;

    // Formatar datas
    const formattedCorporateUser = this.formatDates(cleanCorporateUser);

    return {
      access_token: this.jwtService.sign(payload),
      user: formattedCorporateUser,
      userType: 'corporate_user',
    };
  }

  async clientLogin(cpf: string, password: string) {
    const client = await this.validateClient(cpf, password);

    const payload = {
      sub: client.id,
      email: client.email,
      cpf: client.cpf,
      userType: 'client',
    };

    // Remover propriedades sensíveis antes de retornar
    const {
      password: _,
      isDefault: __,
      isProtected: ___,
      ...cleanClient
    } = client as any;

    // Formatar datas
    const formattedClient = this.formatDates(cleanClient);

    return {
      access_token: this.jwtService.sign(payload),
      user: formattedClient,
      userType: 'client',
    };
  }

  async deleteAgent(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agente não encontrado');
    }

    if (agent.isProtected) {
      throw new Error('Não é possível excluir um agente protegido');
    }

    return await this.prisma.agent.delete({
      where: { id: agentId },
    });
  }

  async deleteClient(clientId: string) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    if (client.isProtected) {
      throw new Error('Não é possível excluir um cliente protegido');
    }

    return await this.prisma.user.delete({
      where: { id: clientId },
    });
  }
}
