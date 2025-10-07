import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  SetMetadata,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Login -> return access token and set refresh token cookie (httpOnly)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.username, dto.password);
    // set httpOnly cookie for refresh token
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      expiresIn: result.expiresIn,
    };
  }

  // refresh -> read refresh token cookie, rotate
  @Post('refresh')
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const tokens = await this.authService.refreshToken(refreshToken);

      // Set cookie mới cho refresh (optional, nếu FE dùng cookie)
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      });
      return tokens; // { accessToken, expiresIn, refreshToken }
    } catch (error) {
      res.clearCookie('refresh_token');
      throw new BadRequestException('Refresh failed', error);
    }
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
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('uid', { path: '/' });
    return { ok: true };
  }
}
