import { Module } from '@nestjs/common';
import { ProductFieldsController } from './product-fields.controller';
import { ProductFieldsService } from './product-fields.service';

@Module({
  controllers: [ProductFieldsController],
  providers: [ProductFieldsService],
  exports: [ProductFieldsService],
})
export class ProductFieldsModule {}
