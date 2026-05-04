import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class ApiKeyGuard implements CanActivate {
    private readonly prisma;
    constructor(prisma: PrismaService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
