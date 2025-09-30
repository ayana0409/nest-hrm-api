import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../user/schema/user.schema';
import { PasswordHelper } from '@/common/helpers/passwordHelper';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    // Create and store hashed refresh token
    const { rawToken, hashed } = await this.createRefreshToken();
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(hashed);
    await user.save();

    return {
      accessToken,
      refreshToken: rawToken, // send raw to client (store in httpOnly cookie)
      user: {
        id: user._id.toString(),
        username: user.username,
        roles: user.role,
      },
    };
  }

  // refresh: rotate refresh token
  async refresh(userId: string, currentRawRefreshToken: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // find a stored hashed token that matches currentRawRefreshToken
    let matchedIndex = -1;
    for (let i = 0; i < (user.refreshTokens?.length || 0); i++) {
      const hashed = user.refreshTokens[i];
      const ok = await this.passwordHelper.validatePasswordAsync(
        currentRawRefreshToken,
        hashed,
      );
      if (ok) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      // token not found -> possible reuse - revoke all existing tokens for safety
      user.refreshTokens = [];
      await user.save();
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate: remove old hashed token and add new hashed token
    user.refreshTokens.splice(matchedIndex, 1);

    const { rawToken: newRaw, hashed: newHashed } =
      await this.createRefreshToken();
    user.refreshTokens.push(newHashed);
    await user.save();

    const payload = {
      sub: user._id.toString(),
      username: user.username,
      roles: [user.role],
    };
    const newAccessToken = this.createAccessToken(payload);

    return { accessToken: newAccessToken, refreshToken: newRaw };
  }

  // logout: remove specific refresh token (or clear all)
  async logout(userId: string, refreshToken?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) return;
    if (!refreshToken) {
      user.refreshTokens = [];
    } else {
      // remove matching hashed entry(s)
      user.refreshTokens = user.refreshTokens.filter((rt) => {
        // we must compare raw->hash; but compute compare async; simpler: we will remove any that match
        return true; // we'll handle below
      });
      // safer approach: re-filter by comparing
      const remaining: string[] = [];
      for (const hashed of user.refreshTokens || []) {
        const isMatch = await this.passwordHelper.validatePasswordAsync(
          refreshToken,
          hashed,
        );
        if (!isMatch) remaining.push(hashed);
      }
      user.refreshTokens = remaining;
    }
    await user.save();
  }
}
