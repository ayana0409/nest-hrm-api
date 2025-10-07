import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../user/schema/user.schema';
import { PasswordHelper } from '@/common/helpers/passwordHelper';
import { convertToSeconds } from '@/common/helpers/dateHelper';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../user/schema/refresh-token.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordHelper: PasswordHelper,
  ) {}

  // validate username/password
  async validateUser(username: string, password: string) {
    const user = await this.userModel.findOne({ username }).lean();
    if (!user) return null;
    const ok = await this.passwordHelper.validatePasswordAsync(
      password,
      user.password,
    );
    if (!ok) return null;
    // remove password
    // return full user doc if needed
    return user;
  }

  // create access token
  createAccessToken(payload: {
    sub: string;
    username: string;
    roles?: string[];
  }) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES') || '15m',
    });
  }

  // create refresh token raw and hashed
  async createRefreshToken() {
    const rawToken = crypto.randomBytes(64).toString('hex'); // raw refresh token
    const hashed = await this.passwordHelper.hashPasswordAsync(rawToken);
    return { rawToken, hashed };
  }

  // login: verify credentials, issue tokens, save hashed refresh token to user, return tokens
  async login(username: string, password: string) {
    const user = await this.userModel.findOne({ username });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.passwordHelper.validatePasswordAsync(
      password,
      user.password,
    );
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id.toString(),
      username: user.username,
      roles: [user.role],
    };
    const accessToken = this.createAccessToken(payload);
    // Lấy config (ví dụ "15m" hoặc "900s")
    const expiresInConfig =
      this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';

    // Chuyển "15m" => 900 (giây)
    const expiresInSeconds = convertToSeconds(expiresInConfig);
    // Create and store hashed refresh token
    const { rawToken, hashed } = await this.createRefreshToken();
    this.refreshTokenModel.create({ userId: user._id, refreshToken: rawToken });

    return {
      accessToken,
      refreshToken: rawToken, // send raw to client (store in httpOnly cookie)
      user: {
        id: user._id.toString(),
        username: user.username,
        roles: user.role,
      },
      expiresIn: expiresInSeconds,
    };
  }

  // refresh: rotate refresh token
  async refreshToken(oldRefreshToken: string) {
    const isTokenUsed = await this.isTokenUsed(oldRefreshToken);
    if (isTokenUsed) return { refreshToken: oldRefreshToken };

    var oldRefreshTokenDoc = await this.refreshTokenModel.findOne({
      refreshToken: oldRefreshToken,
      used: false,
    });

    if (!oldRefreshTokenDoc) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Xóa hashed cũ (revoke)
    oldRefreshTokenDoc.used = true;
    await oldRefreshTokenDoc.save();

    const matchedUser = await this.userModel.findById(
      oldRefreshTokenDoc.userId,
    );
    if (!matchedUser) {
      throw new BadRequestException('Invalid refresh token');
    }
    // Tạo tokens mới
    const newAccessToken = this.createAccessToken({
      sub: matchedUser._id.toString(),
      username: matchedUser.username,
      roles: [matchedUser.role],
    });

    const expiresInConfig =
      this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';
    const expiresInSeconds = convertToSeconds(expiresInConfig);

    const { rawToken: newRefreshToken, hashed: newHashed } =
      await this.createRefreshToken();

    this.refreshTokenModel.create({
      userId: matchedUser._id,
      refreshToken: newRefreshToken,
    });
    await this.markTokenAsUsed(oldRefreshToken);

    return {
      accessToken: newAccessToken,
      expiresIn: expiresInSeconds,
      refreshToken: newRefreshToken,
    };
  }

  // logout: remove specific refresh token (or clear all)
  async logout(userId: string, refreshToken?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) return;
    this.refreshTokenModel.deleteMany({ userId: user._id });
  }

  async isTokenUsed(token: string): Promise<boolean> {
    const key = `used_refresh_token:${token}`;
    const exists = await this.cacheManager.get(key);
    return !!exists;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    const key = `used_refresh_token:${token}`;
    await this.cacheManager.set(
      key,
      true,
      parseInt(this.configService.get<string>('CACHE_TIME_LIFE') || '30000'),
    );
  }
}
