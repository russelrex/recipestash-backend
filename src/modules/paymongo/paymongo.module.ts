import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymongoService } from './paymongo.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymongoService],
  exports: [PaymongoService],
})
export class PaymongoModule {}
