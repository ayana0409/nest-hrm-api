import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Nếu controller không trả dữ liệu (vd: DELETE 204)
        if (data === undefined) {
          return {
            success: true,
            statusCode: response.statusCode,
            message: 'No content',
          };
        }

        return {
          success: true,
          statusCode: response.statusCode,
          data,
        };
      }),
    );
  }
}
