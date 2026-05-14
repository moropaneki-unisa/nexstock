import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ProductFieldsService } from './product-fields.service';

@Controller(['product-fields', 'products/fields'])
@UseGuards(JwtAuthGuard)
export class ProductFieldsController {
  constructor(private readonly fields: ProductFieldsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.fields.list(user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.fields.get(user.organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: Record<string, unknown>) {
    return this.fields.create(user.organizationId, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.fields.update(user.organizationId, id, body);
  }

  @Delete(':id')
  delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.fields.delete(user.organizationId, id);
  }
}
