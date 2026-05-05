import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { IntegrationsService, ZohoConnectInput } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.integrations.list(user.organizationId);
  }

  @Get('zoho/connect')
  @UseGuards(JwtAuthGuard)
  connectZoho(@CurrentUser() user: CurrentUserPayload) {
    return this.integrations.buildZohoConnectUrl(user.organizationId);
  }

  @Post('zoho/connect')
  @UseGuards(JwtAuthGuard)
  connectZohoWithCredentials(@CurrentUser() user: CurrentUserPayload, @Body() body: ZohoConnectInput) {
    return this.integrations.buildZohoConnectUrl(user.organizationId, body);
  }

  @Get('zoho/callback')
  async zohoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.integrations.handleZohoCallback({ code, state, error });
    return response.redirect(redirectUrl);
  }

  @Post('zoho/sync')
  @UseGuards(JwtAuthGuard)
  syncZoho(@CurrentUser() user: CurrentUserPayload) {
    return this.integrations.syncZohoProducts(user.organizationId);
  }
}
