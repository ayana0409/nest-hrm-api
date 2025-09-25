import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordHelper {
  private readonly saltRounds: number;

  constructor(private configService: ConfigService) {
    this.saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10'), 10);
  }

  async hashPasswordAsync(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async validatePasswordAsync(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
