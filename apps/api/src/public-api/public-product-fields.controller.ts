import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ProductFieldsService } from '../product-fields/product-fields.service';
import {
  CreateProductFieldDto,
  UpdateProductFieldDto,
} from '../product-fields/dto';

type ApiRequest = Request & {
  apiOrganizationId: string;
  apiScopes: string[];
};

@Controller('v1/product-fields')
@UseGuards(ApiKeyGuard)
export class PublicProductFieldsController {
  constructor(private readonly productFields: ProductFieldsService) {}

  @Get()
  list(@Req() req: ApiRequest) {
    this.assertScope(req, 'products:read');
    return this.productFields.list(req.apiOrganizationId);
  }

  @Post()
  create(@Req() req: ApiRequest, @Body() dto: CreateProductFieldDto) {
    this.assertScope(req, 'products:write');
    return this.productFields.create(req.apiOrganizationId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: ApiRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductFieldDto,
  ) {
    this.assertScope(req, 'products:write');
    return this.productFields.update(req.apiOrganizationId, id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Req() req: ApiRequest, @Param('id') id: string) {
    this.assertScope(req, 'products:write');
    return this.productFields.deactivate(req.apiOrganizationId, id);
  }

  private assertScope(req: ApiRequest, scope: string) {
    if (!req.apiScopes?.includes(scope)) {
      throw new ForbiddenException(`Missing scope: ${scope}`);
    }
  }
}