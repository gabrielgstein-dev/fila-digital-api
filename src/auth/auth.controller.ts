import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from '../common/dto/login.dto';
import { CorporateUserLoginDto } from '../common/dto/corporate-user-login.dto';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário corporativo' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - tente novamente em alguns minutos',
  })
  async login(@Body() loginDto: CorporateUserLoginDto) {
    return this.authService.corporateUserLogin(
      loginDto.email,
      loginDto.password,
    );
  }

  @Post('agent/login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de atendente/gestor' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - tente novamente em alguns minutos',
  })
  async agentLogin(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.cpf, loginDto.password);
  }

  @Post('client/login')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de cliente' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - tente novamente em alguns minutos',
  })
  async clientLogin(@Body() loginDto: LoginDto) {
    return this.authService.clientLogin(loginDto.cpf, loginDto.password);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Iniciar login com Google',
    description: 'Redireciona para autenticação Google OAuth 2.0',
  })
  @ApiResponse({ status: 302, description: 'Redirecionamento para Google' })
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
      'Para APPs móveis que já possuem token Google válido. Valida o token e faz login automático',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'JWT token de acesso' },
        userType: {
          type: 'string',
          description: 'Tipo do usuário (client, corporate_user, agent)',
        },
        user: { type: 'object', description: 'Dados do usuário logado' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token Google inválido ou expirado',
  })
  async googleMobileLogin(@Body() body: { access_token: string; user: any }) {
    return this.authService.validateGoogleTokenAndLogin(
      body.access_token,
      body.user,
    );
  }
}
