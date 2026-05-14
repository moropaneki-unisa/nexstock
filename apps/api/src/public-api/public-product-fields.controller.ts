import {
  Controller,
  ForbiddenException,
  GoneException,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ApiKeyGuard } from '../api-keys/api-key.guard';

type ApiRequest = Request & {
  apiOrganizationId: string;
  apiScopes: string[];
};

@Controller('v1/product-fields')
@UseGuards(ApiKeyGuard)
export class PublicProductFieldsController {
  @Get()
  list(@Req() req: ApiRequest) {
    this.assertScope(req, 'products:read');
    return [];
  }

  @Post()
  create(@Req() req: ApiRequest) {
    this.assertScope(req, 'products:write');
    throw new GoneException('Legacy product fields were removed. Use product layouts instead.');
  }

  @Patch(':id')
  update(@Req() req: ApiRequest) {
    this.assertScope(req, 'products:write');
    throw new GoneException('Legacy product fields were removed. Use product layouts instead.');
  }

  @Post(':id/deactivate')
  deactivate(@Req() req: ApiRequest) {
    this.assertScope(req, 'products:write');
    throw new GoneException('Legacy product fields were removed. Use product layouts instead.');
  }

  private assertScope(req: ApiRequest, scope: string) {
    if (!req.apiScopes?.includes(scope)) {
      throw new ForbiddenException(`Missing scope: ${scope}`);
    }
  }
}
