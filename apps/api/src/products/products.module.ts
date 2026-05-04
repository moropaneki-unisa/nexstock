import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ProductImagesController } from './product-images.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [WebhooksModule],
  controllers: [ProductsController, ProductImagesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
