import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProductFieldsModule } from '../product-fields/product-fields.module';
import { ProductsModule } from '../products/products.module';
import { PublicProductFieldsController } from './public-product-fields.controller';
import { PublicProductsController } from './public-products.controller';

@Module({
  imports: [ApiKeysModule, ProductsModule, ProductFieldsModule],
  controllers: [PublicProductsController, PublicProductFieldsController],
})
export class PublicApiModule {}
