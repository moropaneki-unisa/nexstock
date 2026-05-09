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
      industry?: string;
      onboardingComplete?: boolean;
    },
  ) {
    return this.service.updateOrganization(user, body);
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
