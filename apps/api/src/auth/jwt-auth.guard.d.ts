import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwt;
    constructor(jwt: JwtService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
