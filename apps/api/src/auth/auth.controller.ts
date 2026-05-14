import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Throttle, ThrottleGuard } from '../common/guards/throttle.guard';
import { AcceptInviteDto, LoginDto, SignupDto } from './dto';

const isProduction = process.env.NODE_ENV === 'production';

function cookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN || undefined;
}

function setAuthCookies(response: Response, tokens: { accessToken: string; refreshToken: string }) {
  const baseCookie = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    domain: cookieDomain(),
    path: '/',
  };

  response.cookie('ih_access_token', tokens.accessToken, {
    ...baseCookie,
    maxAge: 15 * 60 * 1000,
  });

  response.cookie('ih_refresh_token', tokens.refreshToken, {
    ...baseCookie,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(response: Response) {
  const baseCookie = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    domain: cookieDomain(),
    path: '/',
  };

  response.clearCookie('ih_access_token', baseCookie);
  response.clearCookie('ih_refresh_token', baseCookie);
}

function getRequestMeta(request: Request) {
  return {
    ip: request.ip,
    ua: request.headers['user-agent'],
  };
}

function getRefreshToken(request: Request, body?: { refreshToken?: string }) {
  const cookieHeader = request.headers.cookie || '';
  const cookieToken = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('ih_refresh_token='))
    ?.split('=')[1];

  return cookieToken ? decodeURIComponent(cookieToken) : body?.refreshToken;
}

@Controller('auth')
@UseGuards(ThrottleGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @Throttle(10, 60_000)
  async signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  @Throttle(10, 60_000)
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.login(dto.email, dto.password, getRequestMeta(request));
    setAuthCookies(response, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @Throttle(30, 60_000)
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.refresh(getRefreshToken(request, body), getRequestMeta(request));
    setAuthCookies(response, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('invite/accept')
  @Throttle(10, 60_000)
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.acceptInvite(dto, getRequestMeta(request));
    setAuthCookies(response, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('verify-email')
  @Throttle(15, 60_000)
  async verifyEmail(
    @Body() body: { email: string; otp: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.verifyEmail(body.email, body.otp, getRequestMeta(request));
    setAuthCookies(response, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('resend-otp')
  @Throttle(5, 60_000)
  async resend(@Body() body: { email: string }) {
    return this.auth.resendOtp(body.email);
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(getRefreshToken(request, body));
    clearAuthCookies(response);
    return { ok: true };
  }
}
