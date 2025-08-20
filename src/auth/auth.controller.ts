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
  @ApiOperation({ summary: 'Login de atendente/gestor' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - tente novamente em alguns minutos',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
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

      if (result.userType === 'agent') {
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
    description: 'Para APPs móveis que já possuem token Google',
  })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Token Google inválido' })
  async googleMobileLogin(@Body() body: { idToken: string }) {
    // TODO: Implementar validação de ID Token do Google
    // Para simplificar agora, usar o callback web
    throw new Error('Implementar validação de ID Token');
  }
}
