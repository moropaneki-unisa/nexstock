import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type CurrentUserPayload = {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
};

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as CurrentUserPayload;
});
