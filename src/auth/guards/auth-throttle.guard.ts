import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Para login, rastrear por IP + email para prevenir brute force
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';

    return `auth:${ip}:${email}`;
  }

  protected generateKey(context: any, suffix: string, name: string): string {
    // Mais restritivo para autenticação
    return `${name}:${suffix}`;
  }
}
