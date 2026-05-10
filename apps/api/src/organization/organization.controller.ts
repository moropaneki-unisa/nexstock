import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  getOrganization(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getOrganization(user);
  }

  @Patch()
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name?: string;
      slug?: string;
      skuPrefix?: string;
      baseCurrency?: string;
      enabledCurrencies?: string[];
      exchangeRates?: Array<{ code: string; rateToBase: number }> | Record<string, number>;
      autoRefreshRates?: boolean;
      industry?: string;
      onboardingComplete?: boolean;
      legalName?: string;
      tradingName?: string;
      registrationNo?: string;
      vatNumber?: string;
      companySize?: string;
      website?: string;
      phone?: string;
      billingEmail?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    },
  ) {
    return this.service.updateOrganization(user, body);
  }

  @Post('currency-rates/refresh')
  refreshCurrencyRates(@CurrentUser() user: CurrentUserPayload) {
    return this.service.refreshCurrencyRates(user);
  }

  @Post('invite')
  invite(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { email: string; role: string },
  ) {
    return this.service.inviteUser(user, body.email, body.role);
  }

  @Patch('member/:id/role')
  updateRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.service.updateMemberRole(user, id, body.role);
  }

  @Delete('member/:id')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.service.removeMember(user, id);
  }

  @Patch('plan')
  updatePlan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { plan: string },
  ) {
    return this.service.updatePlan(user, body.plan);
  }
}
