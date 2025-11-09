import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RequestContextService } from './request-context';

@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const context = new RequestContextService();
    context.run(() => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded: any = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET!,
          );
          console.log('DECODE', decoded);
          RequestContextService.set('userId', decoded.sub || decoded.userId);
          RequestContextService.set('email', decoded.email);
          RequestContextService.set('name', decoded.name);
        } catch (err) {
          console.warn('Invalid or expired token');
        }
      }
      next();
    });
  }
}
