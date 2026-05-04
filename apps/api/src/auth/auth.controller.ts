import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.signup(dto, { ip: req.ip, ua: req.headers['user-agent'] });
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password, { ip: req.ip, ua: req.headers['user-agent'] });
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.refresh(req.cookies?.rt, { ip: req.ip, ua: req.headers['user-agent'] });
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(req.cookies?.rt);
    res.clearCookie('rt', { path: '/api/auth' });
    return result;
  }

  private setRefreshCookie(res: Response, value: string) {
    res.cookie('rt', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
