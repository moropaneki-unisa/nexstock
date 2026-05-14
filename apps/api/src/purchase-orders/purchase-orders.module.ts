import { Module } from '@nestjs/common';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';
import { EmailModule } from '../email/email.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [DocumentTemplatesModule, EmailModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
