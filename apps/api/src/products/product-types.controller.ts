import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateProductTypeDto, UpdateProductTypeDto } from './product-types.dto';
import { ProductTypesService } from './product-types.service';

@Controller('product-types')
@UseGuards(JwtAuthGuard)
export class ProductTypesController {
  constructor(private readonly productTypes: ProductTypesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.productTypes.list(user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.productTypes.get(user.organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProductTypeDto) {
    return this.productTypes.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateProductTypeDto) {
    return this.productTypes.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.productTypes.delete(user.organizationId, id);
  }
}
