import { UserRole } from '@prisma/client';
export type CurrentUserPayload = {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
