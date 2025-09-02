import { Module, DynamicModule } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantAuthGuard } from './guards/tenant-auth.guard';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
            },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        // Incluir GoogleStrategy apenas se as variáveis estão configuradas
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? [GoogleStrategy]
          : []),
        JwtAuthGuard,
        TenantAuthGuard,
        AuthThrottleGuard,
      ],
      exports: [AuthService, JwtAuthGuard, TenantAuthGuard, AuthThrottleGuard],
    };
  }
}
