import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ALGORITHM, publicKeyFrom } from '../../../../common/config/jwt-keys.js';
import { UsersService } from '../../users/users.service.js';
import type { AuthUser, JwtPayload } from '../types/auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKeyFrom(config),
      algorithms: [JWT_ALGORITHM],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, name: user.fullName, email: user.email, role: user.role };
  }
}
