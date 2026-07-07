import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../common/skip-auth.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly expectedToken: string;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    this.expectedToken = this.configService.get<string>(
      'STACKHAND_API_TOKEN',
      'dev-token',
    );
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== this.expectedToken) {
      throw new UnauthorizedException('Invalid or missing API token');
    }
    return true;
  }
}
