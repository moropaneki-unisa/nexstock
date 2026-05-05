import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post('invite')
  invite(@Req() req: any, @Body() body: { email: string; role: string }) {
    return this.service.inviteUser(req.user, body.email, body.role);
  }
}
