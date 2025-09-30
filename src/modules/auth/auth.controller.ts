import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Login -> return access token and set refresh token cookie (httpOnly)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.login(dto.username, dto.password);
    // set httpOnly cookie for refresh token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: parseInt(process.env.REFRESH_TOKEN_COOKIE_AGE || '604800000'), // e.g., 7 days
    });

    return { accessToken: result.accessToken, user: result.user };
  }

  // refresh -> read refresh token cookie, rotate
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const cookie = req.cookies['refresh_token'];
    if (!cookie) throw new Error('No refresh token');

    // extract userId from cookie? We need a way: one approach is store userId in cookie as well or use separate subject in cookie.
    // Better: include userId in refresh token cookie? For simplicity, send userId in body or decode from access token expired - here we assume client sends userId in body or cookie holds encoded userId.
    // Simpler approach below: client sends userId in header or cookie called refresh_token and userId cookie 'uid'.
    const userId = req.cookies['uid'];
    if (!userId) throw new Error('No uid cookie');

    const { accessToken, refreshToken } = await this.authService.refresh(
      userId,
      cookie,
    );

    // set new refresh token cookie (rotation)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: parseInt(process.env.REFRESH_TOKEN_COOKIE_AGE || '604800000'),
    });

    return { accessToken };
  }

  // logout: clear cookie and remove token from DB
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const user = req.user as any;
    const refreshToken = req.cookies['refresh_token'];
    await this.authService.logout(
      user._id?.toString?.() || user.userId,
      refreshToken,
    );
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    res.clearCookie('uid', { path: '/auth/refresh' });
    return { ok: true };
  }
}
