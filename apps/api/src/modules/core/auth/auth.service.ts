import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { INVALID_CREDENTIALS } from '../../../common/enums/auth.js';
import type { User } from '../../../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto, RegisterDto } from './dto/index.js';
import type { AuthResponse, AuthUser, JwtPayload } from './types/auth.types.js';
import { PasswordUtil } from './utils/password.util.js';

type TokenSubject = Pick<User, 'id' | 'fullName' | 'email' | 'role'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.issue(await this.usersService.create(dto));
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.issue(await this.authenticate(dto.email, dto.password));
  }

  private issue(user: TokenSubject): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { user: this.toAuthUser(user), accessToken: this.jwtService.sign(payload) };
  }

  private toAuthUser(user: TokenSubject): AuthUser {
    return { id: user.id, name: user.fullName, email: user.email, role: user.role };
  }

  private async authenticate(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await PasswordUtil.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return user;
  }
}
