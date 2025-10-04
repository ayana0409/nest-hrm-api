import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    const custom = this.filter(exception);
    if (custom) {
      status = custom.status;
      message = custom.message;
      errorCode = custom.errorCode;
      response.status(status).json({
        success: false,
        statusCode: status,
        errorCode,
        message,
      });

      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const respObj = res as Record<string, any>;
        message = respObj.message || message;
        errorCode = respObj.errorCode || respObj.error || errorCode;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
    });
  }

  private filter(exception: any) {
    if (exception?.name === 'CastError' && exception?.kind === 'ObjectId') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `Invalid ObjectId: ${exception.value}`,
        errorCode: 'INVALID_OBJECT_ID',
      };
    }

    if (
      exception?.name === 'UnauthorizedException' &&
      exception?.status === 401
    ) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: `${exception.message || 'Unauthorized'}`,
        errorCode: 'UNAUTHORIZED',
      };
    }
    // Validation
    if (exception?.name === 'ValidationError' && exception?.errors) {
      const messages = Object.values(exception.errors).map(
        (err: any) => err.message,
      );
      return {
        status: HttpStatus.BAD_REQUEST,
        message: messages,
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Duplicate key
    if (exception?.code === 11000 && exception?.keyValue) {
      const field = Object.keys(exception.keyValue)[0];
      const value = exception.keyValue[field];
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `${field}: '${value}' has been existed`,
        errorCode: 'DUPLICATE_KEY',
      };
    }

    if (
      exception?.name?.includes('Mongo') ||
      exception?.message?.includes('Mongo')
    ) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Lỗi từ MongoDB',
        errorCode: 'MONGO_ERROR',
      };
    }
    return null;
  }
}
