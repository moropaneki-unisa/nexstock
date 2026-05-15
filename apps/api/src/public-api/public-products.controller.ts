import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { AdjustInventoryDto, CreateProductDto, ListProductsDto, UpdateProductDto } from '../products/dto';
import { ProductsService } from '../products/products.service';

type ApiRequest = Request & { apiOrganizationId: string; apiScopes: string[] };

@Controller('v1/products')
@UseGuards(ApiKeyGuard)
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Req() req: ApiRequest, @Query() query: ListProductsDto) {
    this.assertScope(req, 'products:read');
    return this.products.list(req.apiOrganizationId, query);
  }

  @Get(':id')
  get(@Req() req: ApiRequest, @Param('id') id: string) {
    this.assertScope(req, 'products:read');
    return this.products.get(req.apiOrganizationId, id);
  }

  @Post()
  create(@Req() req: ApiRequest, @Body() dto: CreateProductDto) {
    this.assertScope(req, 'products:write');
    return this.products.create(req.apiOrganizationId, dto);
  }

  @Patch(':id')
  update(@Req() req: ApiRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    this.assertScope(req, 'products:write');
    return this.products.update(req.apiOrganizationId, id, dto);
  }

  @Post(':id/adjust')
  adjustInventory(@Req() req: ApiRequest, @Param('id') id: string, @Body() dto: AdjustInventoryDto) {
    this.assertScope(req, 'products:write');
    return this.products.adjustInventory(req.apiOrganizationId, id, {
      ...dto,
      source: dto.source?.trim() || 'public_api',
    });
  }

  private assertScope(req: ApiRequest, scope: string) {
    if (!req.apiScopes?.includes(scope)) throw new ForbiddenException(`Missing scope: ${scope}`);
  }
}
