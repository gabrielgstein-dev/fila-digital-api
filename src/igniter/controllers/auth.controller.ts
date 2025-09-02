import { igniter } from '../igniter';
import { z } from 'zod';
import { AuthService } from '../../auth/auth.service';

// Schemas de validação
const loginSchema = z.object({
  cpf: z.string().min(11).max(14),
  password: z.string().min(1),
});

const corporateUserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleMobileLoginSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    picture: z.string().optional(),
  }),
});

// Controlador de autenticação
export const authController = igniter.controller({
  path: '/auth',
  actions: {
    login: igniter.mutation({
      path: '/login',
      body: corporateUserLoginSchema,
      handler: async ({ input, context }) => {
        const authService = new AuthService(context.database);
        return authService.corporateUserLogin(input.email, input.password);
      },
    }),

    agentLogin: igniter.mutation({
      path: '/agent/login',
      body: loginSchema,
      handler: async ({ input, context }) => {
        const authService = new AuthService(context.database);
        return authService.login(input.cpf, input.password);
      },
    }),

    clientLogin: igniter.mutation({
      path: '/client/login',
      body: loginSchema,
      handler: async ({ input, context }) => {
        const authService = new AuthService(context.database);
        return authService.clientLogin(input.cpf, input.password);
      },
    }),

    googleAuth: igniter.query({
      path: '/google',
      handler: async ({ response }) => {
        const googleAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&scope=email profile&response_type=code`;
        return response.redirect(googleAuthUrl);
      },
    }),

    googleCallback: igniter.query({
      path: '/google/callback',
      handler: async ({ request, response, context }) => {
        try {
          const authService = new AuthService(context.database);
          const code = request.query.code as string;

          const result = await authService.handleGoogleCallback(code);
          const frontendUrl =
            process.env.FRONTEND_URL || 'http://localhost:3000';

          let redirectUrl: string;
          if (result.userType === 'corporate_user') {
            redirectUrl = `${frontendUrl}/corporate-dashboard?token=${result.access_token}&type=corporate_user`;
          } else if (result.userType === 'agent') {
            redirectUrl = `${frontendUrl}/dashboard?token=${result.access_token}&type=agent`;
          } else {
            redirectUrl = `${frontendUrl}/app?token=${result.access_token}&type=client`;
          }

          return response.redirect(redirectUrl);
        } catch (error) {
          const frontendUrl =
            process.env.FRONTEND_URL || 'http://localhost:3000';
          const errorUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`;
          return response.redirect(errorUrl);
        }
      },
    }),

    googleMobileLogin: igniter.mutation({
      path: '/google/token',
      body: googleMobileLoginSchema,
      handler: async ({ input, context }) => {
        const authService = new AuthService(context.database);
        return authService.validateGoogleTokenAndLogin(
          input.access_token,
          input.user,
        );
      },
    }),
  },
});
