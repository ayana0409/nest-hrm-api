import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service'; // bạn có thể fetch user if needed

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    // payload.sub is userId
    // Optionally fetch fresh user:
    const user = await this.userService.findOne(payload.sub);
    // return user object attached to req.user
    return (
      user || {
        userId: payload.sub,
        username: payload.username,
        roles: payload.roles,
      }
    );
  }
}
