import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context';

@Global() // giúp module khả dụng toàn cục, không cần import từng nơi
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
