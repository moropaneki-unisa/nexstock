import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProductsModule } from '../products/products.module';
import { PublicProductsController } from './public-products.controller';
import { ProductFieldsModule } from 'src/product-fields/product-fields.module';
import { PublicProductFieldsController } from './public-product-fields.controller';

@Module({
  imports: [ApiKeysModule, ProductsModule, ProductFieldsModule],
  controllers: [PublicProductsController, PublicProductFieldsController],
})
export class PublicApiModule {}
