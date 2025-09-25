import { Module } from '@nestjs/common';
import { PasswordHelper } from './helpers/passwordHelper';

@Module({
  providers: [PasswordHelper],
  exports: [PasswordHelper],
})
export class CommonModule {}
