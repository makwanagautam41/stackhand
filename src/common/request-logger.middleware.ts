import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[http] ${method} ${originalUrl} -> ${res.statusCode} ${durationMs}ms`,
      );
    });

    next();
  }
}
