import { HttpException, HttpStatus } from '@nestjs/common';

export class ConflictException extends HttpException {
  constructor(message?: string, errorCode?: string) {
    super(
      { message, errorCode },
      HttpStatus.CONFLICT,
    );
  }
}

export class NotFoundException extends HttpException {
  constructor(message?: string, errorCode?: string) {
    super(
      { message, errorCode },
      HttpStatus.NOT_FOUND,
    );
  }
}