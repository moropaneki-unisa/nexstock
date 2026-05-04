import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductFieldsService } from './product-fields.service';
import { CreateProductFieldDto, UpdateProductFieldDto } from './dto';

@Controller('product-fields')
@UseGuards(JwtAuthGuard)
export class ProductFieldsController {
  constructor(private readonly fields: ProductFieldsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.fields.list(user.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProductFieldDto,
  ) {
    return this.fields.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductFieldDto,
  ) {
    return this.fields.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.fields.deactivate(user.organizationId, id);
  }
}
