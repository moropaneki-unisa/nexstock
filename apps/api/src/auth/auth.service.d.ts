import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export type TokenMeta = {
    ip?: string;
    ua?: string;
};
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    signup(dto: {
        email: string;
        password: string;
        name: string;
        orgName: string;
    }, meta: TokenMeta): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(emailInput: string, password: string, meta: TokenMeta): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshRaw: string | undefined, meta: TokenMeta): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshRaw: string | undefined): Promise<{
        ok: boolean;
    }>;
    private issueTokens;
}
