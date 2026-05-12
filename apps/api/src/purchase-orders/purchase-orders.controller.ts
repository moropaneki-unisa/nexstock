import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.purchaseOrders.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.purchaseOrders.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrders.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrders.update(user, id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.purchaseOrders.cancel(user, id);
  }
}
