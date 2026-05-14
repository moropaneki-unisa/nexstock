import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ProductImagesController } from './product-images.controller';
import { ProductTypesController } from './product-types.controller';
import { ProductTypesService } from './product-types.service';
import { ProductsController } from './products.controller';
import { ProductsImportExportService } from './products-import-export.service';
import { ProductsService } from './products.service';

@Module({
  imports: [WebhooksModule],
  controllers: [ProductsController, ProductImagesController, ProductTypesController],
  providers: [ProductsService, ProductsImportExportService, ProductTypesService],
  exports: [ProductsService, ProductTypesService],
})
export class ProductsModule {}
