import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CorporateUserLoginDto } from '../common/dto/corporate-user-login.dto';
import { LoginDto } from '../common/dto/login.dto';
import { AuthService } from './auth.service';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de usuário corporativo',
    description:
      'Autentica um usuário corporativo usando email e senha. Retorna um JWT token que deve ser usado nas requisições subsequentes. Use este endpoint quando um usuário corporativo (gerente, administrador de tenant) precisa fazer login no sistema. Limite: 5 tentativas por minuto.',
  })
  @ApiBody({ type: CorporateUserLoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna o token JWT e dados do usuário.',
    schema: {
      type: 'object',
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@empresa.com',
          name: 'João Silva',
          role: 'ADMINISTRADOR',
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
        },
        userType: 'corporate_user',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas. Email ou senha incorretos.',
    schema: {
      type: 'object',
      example: {
        statusCode: 401,
        message: 'Credenciais inválidas',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
    schema: {
      type: 'object',
      example: {
        statusCode: 429,
        message:
          'ThrottlerException: Too Many Requests. Limite de 5 tentativas por minuto excedido.',
      },
    },
  })
  async login(@Body() loginDto: CorporateUserLoginDto) {
    console.log('Login para > ', loginDto.email);
    console.log('Password para > ', loginDto.password);
    return this.authService.corporateUserLogin(
      loginDto.email,
      loginDto.password,
    );
  }

  @Post('agent/login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de atendente/gestor',
    description:
      'Autentica um atendente ou gestor usando CPF e senha. Retorna um JWT token para acesso ao sistema de atendimento. Use este endpoint quando um funcionário (atendente, gestor) precisa fazer login para gerenciar filas e chamar tickets. Limite: 5 tentativas por minuto.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna o token JWT e dados do agente.',
    schema: {
      type: 'object',
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          cpf: '12345678900',
          name: 'Maria Santos',
          role: 'ATENDENTE',
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
        },
        userType: 'agent',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas. CPF ou senha incorretos.',
    schema: {
      type: 'object',
      example: {
        statusCode: 401,
        message: 'Credenciais inválidas',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
    schema: {
      type: 'object',
      example: {
        statusCode: 429,
        message:
          'ThrottlerException: Too Many Requests. Limite de 5 tentativas por minuto excedido.',
      },
    },
  })
  async agentLogin(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.cpf, loginDto.password);
  }

  @Post('client/login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de cliente',
    description:
      'Autentica um cliente usando CPF e senha. Retorna um JWT token para acesso ao app do cliente. Use este endpoint quando um cliente precisa fazer login para consultar seus tickets e senhas na fila. Limite: 5 tentativas por minuto.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna o token JWT e dados do cliente.',
    schema: {
      type: 'object',
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          cpf: '98765432100',
          name: 'Pedro Oliveira',
          phone: '(11) 99999-8888',
          email: 'pedro@email.com',
        },
        userType: 'client',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas. CPF ou senha incorretos.',
    schema: {
      type: 'object',
      example: {
        statusCode: 401,
        message: 'Credenciais inválidas',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
    schema: {
      type: 'object',
      example: {
        statusCode: 429,
        message:
          'ThrottlerException: Too Many Requests. Limite de 5 tentativas por minuto excedido.',
      },
    },
  })
  async clientLogin(@Body() loginDto: LoginDto) {
    return this.authService.clientLogin(loginDto.cpf, loginDto.password);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Iniciar login com Google',
    description:
      'Inicia o fluxo de autenticação OAuth 2.0 com Google. Redireciona o usuário para a página de login do Google. Use este endpoint quando quiser permitir que usuários façam login usando sua conta Google. Após autenticação bem-sucedida, o usuário será redirecionado para o callback (/auth/google/callback) que depois redireciona para o frontend.',
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirecionamento para página de autenticação do Google. O usuário será redirecionado para accounts.google.com.',
  })
  googleAuth() {
    // O guard automaticamente redireciona para o Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint() // Não expor no Swagger (callback interno)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.googleLogin(req.user);

      // Redirecionar baseado no tipo de usuário
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (result.userType === 'corporate_user') {
        // Usuário corporativo -> Dashboard corporativo
        const redirectUrl = `${frontendUrl}/corporate-dashboard?token=${result.access_token}&type=corporate_user`;
        return res.redirect(redirectUrl);
      } else if (result.userType === 'agent') {
        // Agente -> Dashboard administrativo
        const redirectUrl = `${frontendUrl}/dashboard?token=${result.access_token}&type=agent`;
        return res.redirect(redirectUrl);
      } else {
        // Cliente -> APP do cliente
        const redirectUrl = `${frontendUrl}/app?token=${result.access_token}&type=client`;
        return res.redirect(redirectUrl);
      }
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`;
      return res.redirect(errorUrl);
    }
  }

  @Post('google/token')
  @ApiOperation({
    summary: 'Login móvel com token Google',
    description:
      'Autentica um usuário usando token de acesso do Google. Use este endpoint quando desenvolver um aplicativo móvel (iOS/Android) que já possui o token de acesso do Google. O sistema valida o token, identifica o tipo de usuário (cliente, usuário corporativo ou agente) e retorna um JWT token para acesso à API.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['access_token', 'user'],
      properties: {
        access_token: {
          type: 'string',
          description: 'Token de acesso do Google OAuth 2.0',
          example: 'ya29.a0AfH6SMC...',
        },
        user: {
          type: 'object',
          description: 'Dados do perfil do Google',
          properties: {
            id: { type: 'string', example: '123456789' },
            email: { type: 'string', example: 'usuario@gmail.com' },
            name: { type: 'string', example: 'João Silva' },
            picture: {
              type: 'string',
              example: 'https://lh3.googleusercontent.com/a/default-user',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna JWT token e dados do usuário.',
    schema: {
      type: 'object',
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        userType: 'corporate_user',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'usuario@gmail.com',
          name: 'João Silva',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
          role: 'ADMINISTRADOR',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token Google inválido ou expirado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 401,
        message: 'Token Google inválido ou expirado',
        error: 'Unauthorized',
      },
    },
  })
  async googleMobileLogin(@Body() body: { access_token: string; user: any }) {
    return this.authService.validateGoogleTokenAndLogin(
      body.access_token,
      body.user,
    );
  }
}
