import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { getJwtSecret } from '../auth.config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
  AuthJwtPayload,
  AuthenticatedUser,
} from '../types/authenticated-user.type';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: getJwtSecret(this.configService),
      });

      const permissions: string[] = (payload as { permissions?: string[] }).permissions ?? [];
      const roleCodes: string[] = (payload as { roleCodes?: string[] }).roleCodes ?? [payload.roleCode];

      request.user = {
        id: payload.sub,
        username: payload.username,
        fullName: payload.fullName,
        roleCode: payload.roleCode,
        roleCodes: roleCodes as AuthenticatedUser['roleCodes'],
        permissions: permissions as AuthenticatedUser['permissions'],
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(request: Request) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}
