import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [WebhooksModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
