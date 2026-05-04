import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsDto,
  UpdateProductDto,
} from './dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProductsDto,
  ) {
    return this.products.list(user.organizationId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.products.get(user.organizationId, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.organizationId, id, dto);
  }

  @Post(':id/adjust')
  adjust(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.products.adjustInventory(user.organizationId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.products.softDelete(user.organizationId, id);
  }
}
