import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { RepoError } from '../errors/repo.error.js';

const failed = (action: string, error: unknown) =>
  new RepoError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR, error);

@Injectable()
export class UserRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique<T extends Prisma.UserFindUniqueArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>,
  ) {
    try {
      return await this.prisma.user.findUnique(params);
    } catch (error) {
      throw failed('find unique user', error);
    }
  }

  async findFirst<T extends Prisma.UserFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
  ) {
    try {
      return await this.prisma.user.findFirst(params);
    } catch (error) {
      throw failed('find first user', error);
    }
  }

  async findMany<T extends Prisma.UserFindManyArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
  ) {
    try {
      return await this.prisma.user.findMany(params);
    } catch (error) {
      throw failed('find users', error);
    }
  }

  async create<T extends Prisma.UserCreateArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
  ) {
    try {
      return await this.prisma.user.create(params);
    } catch (error) {
      throw failed('create user', error);
    }
  }

  async createMany(params: Prisma.UserCreateManyArgs): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.user.createMany(params);
    } catch (error) {
      throw failed('create users', error);
    }
  }

  async update<T extends Prisma.UserUpdateArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
  ) {
    try {
      return await this.prisma.user.update(params);
    } catch (error) {
      throw failed('update user', error);
    }
  }

  async updateMany(params: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.user.updateMany(params);
    } catch (error) {
      throw failed('update users', error);
    }
  }

  async delete<T extends Prisma.UserDeleteArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserDeleteArgs>,
  ) {
    try {
      return await this.prisma.user.delete(params);
    } catch (error) {
      throw failed('delete user', error);
    }
  }

  async deleteMany(params: Prisma.UserDeleteManyArgs): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.user.deleteMany(params);
    } catch (error) {
      throw failed('delete users', error);
    }
  }

  async count(params?: Prisma.UserCountArgs): Promise<number> {
    try {
      return await this.prisma.user.count(params);
    } catch (error) {
      throw failed('count users', error);
    }
  }

  async groupBy(field: Prisma.UserScalarFieldEnum, where: Prisma.UserWhereInput) {
    try {
      return await this.prisma.user.groupBy({ by: [field], where, _count: { _all: true } });
    } catch (error) {
      throw failed('group users', error);
    }
  }
}
