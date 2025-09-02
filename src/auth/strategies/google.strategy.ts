import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;

      // Validações mais robustas
      if (!id) {
        return done(new Error('ID do Google não disponível'), null);
      }

      if (!emails || emails.length === 0) {
        return done(new Error('Email não disponível na conta Google'), null);
      }

      if (!name || !name.givenName) {
        return done(new Error('Nome não disponível na conta Google'), null);
      }

      const email = emails[0].value;
      const displayName = name.givenName + (name.familyName ? ` ${name.familyName}` : '');
      const picture = photos && photos.length > 0 ? photos[0].value : null;

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return done(new Error('Formato de email inválido'), null);
      }

      // Processar login/registro do usuário
      const user = await this.authService.validateGoogleUser({
        googleId: id,
        email: email.toLowerCase().trim(),
        name: displayName.trim(),
        picture: picture,
      });

      return done(null, user);
    } catch (error) {
      console.error('Erro na validação Google:', error);
      return done(error, null);
    }
  }
}
