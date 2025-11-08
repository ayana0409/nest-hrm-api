import { Injectable, NestMiddleware } from '@nestjs/common';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    RequestContext.run(() => {
      RequestContext.set('userId', req.user?.id);
      next();
    });
  }
}
