import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ADMIN_ONLY_FIELDS,
  OWN_PROFILE_ONLY,
  USER_EXISTS,
  USER_NOT_FOUND,
} from '../../../common/enums/auth.js';
import { RECORD_NOT_FOUND, UNIQUE_VIOLATION } from '../../../common/enums/prisma.js';
import { RepoError } from '../../../common/errors/repo.error.js';
import { UserRepo } from '../../../common/repos/user.repo.js';
import type { User } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import type { AuthUser } from '../auth/types/auth.types.js';
import { PasswordUtil } from '../auth/utils/password.util.js';
import { CreateUserDto, UpdateUserDto, type UserResponse, userSelect } from './dto/index.js';

const translateRepoError = (error: unknown): never => {
  if (error instanceof RepoError && error.hasPrismaCode(UNIQUE_VIOLATION)) {
    throw new ConflictException(USER_EXISTS);
  }
  if (error instanceof RepoError && error.hasPrismaCode(RECORD_NOT_FOUND)) {
    throw new NotFoundException(USER_NOT_FOUND);
  }
  throw error;
};

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UserRepo) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const { password, ...rest } = dto;
    const passwordHash = await PasswordUtil.hash(password);
    return this.userRepo
      .create({ data: { ...rest, passwordHash }, select: userSelect })
      .catch(translateRepoError);
  }

  async findAll(): Promise<UserResponse[]> {
    return this.userRepo.findMany({ select: userSelect });
  }

  async findById(id: string): Promise<UserResponse | null> {
    return this.userRepo.findUnique({ where: { id }, select: userSelect });
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(USER_NOT_FOUND);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findUnique({ where: { email } });
  }

  async update(caller: AuthUser, id: string, dto: UpdateUserDto): Promise<UserResponse> {
    this.assertMayUpdate(caller, id, dto);
    const { password, ...changes } = dto;
    const passwordHash = password ? await PasswordUtil.hash(password) : undefined;
    return this.userRepo
      .update({ where: { id }, data: { ...changes, passwordHash }, select: userSelect })
      .catch(translateRepoError);
  }

  async remove(id: string): Promise<UserResponse> {
    return this.userRepo.delete({ where: { id }, select: userSelect }).catch(translateRepoError);
  }

  private assertMayUpdate(caller: AuthUser, id: string, dto: UpdateUserDto): void {
    if (caller.role === UserRole.ADMIN) return;
    if (caller.id !== id) throw new ForbiddenException(OWN_PROFILE_ONLY);
    if (dto.role !== undefined || dto.status !== undefined) {
      throw new ForbiddenException(ADMIN_ONLY_FIELDS);
    }
  }
}
