import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateSupplierDto, LinkProductSupplierDto, UpdateProductSupplierDto, UpdateSupplierDto } from './dto';
import { SuppliersService } from './suppliers.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get('suppliers')
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.suppliers.list(user);
  }

  @Get('suppliers/:id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliers.get(user, id);
  }

  @Get('suppliers/:id/products')
  listSupplierProducts(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliers.listSupplierProducts(user, id);
  }

  @Post('suppliers')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @Patch('suppliers/:id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(user, id, dto);
  }

  @Patch('suppliers/:id/reactivate')
  reactivate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliers.reactivate(user, id);
  }

  @Delete('suppliers/:id')
  archive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliers.archive(user, id);
  }

  @Get('products/:productId/suppliers')
  listProductSuppliers(@CurrentUser() user: CurrentUserPayload, @Param('productId') productId: string) {
    return this.suppliers.listProductSuppliers(user, productId);
  }

  @Post('products/:productId/suppliers')
  linkProductSupplier(@CurrentUser() user: CurrentUserPayload, @Param('productId') productId: string, @Body() dto: LinkProductSupplierDto) {
    return this.suppliers.linkProductSupplier(user, productId, dto);
  }

  @Patch('products/:productId/suppliers/:linkId')
  updateProductSupplier(
    @CurrentUser() user: CurrentUserPayload,
    @Param('productId') productId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateProductSupplierDto,
  ) {
    return this.suppliers.updateProductSupplier(user, productId, linkId, dto);
  }

  @Delete('products/:productId/suppliers/:linkId')
  unlinkProductSupplier(@CurrentUser() user: CurrentUserPayload, @Param('productId') productId: string, @Param('linkId') linkId: string) {
    return this.suppliers.unlinkProductSupplier(user, productId, linkId);
  }
}
