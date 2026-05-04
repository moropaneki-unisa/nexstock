import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    signup(dto: SignupDto, req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    private setRefreshCookie;
}
