import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  getOrganization(@Req() req: any) {
    return this.service.getOrganization(req.user);
  }

  @Patch()
  update(@Req() req: any, @Body() body: any) {
    return this.service.updateOrganization(req.user, body);
  }

  @Post('invite')
  invite(@Req() req: any, @Body() body: { email: string; role: string }) {
    return this.service.inviteUser(req.user, body.email, body.role);
  }

  @Patch('member/:id/role')
  updateRole(@Req() req: any, @Param('id') id: string, @Body() body: { role: string }) {
    return this.service.updateMemberRole(req.user, id, body.role);
  }

  @Delete('member/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.removeMember(req.user, id);
  }

  @Patch('plan')
  updatePlan(@Req() req: any, @Body() body: { plan: string }) {
    return this.service.updatePlan(req.user, body.plan);
  }
}
