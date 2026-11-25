import { jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RECORD_NOT_FOUND, UNIQUE_VIOLATION } from '../../../common/enums/prisma.js';
import { RepoError } from '../../../common/errors/repo.error.js';
import { UserRepo } from '../../../common/repos/user.repo.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import type { AuthUser } from '../auth/types/auth.types.js';
import { PasswordUtil } from '../auth/utils/password.util.js';
import { UsersService } from './users.service.js';

const DTO = { fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse' };

const MEMBER: AuthUser = {
  id: 'usr_1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: UserRole.USER,
};

const ADMIN: AuthUser = {
  id: 'usr_9',
  name: 'Admin User',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

interface WriteParams {
  where?: { id: string };
  data: { passwordHash?: string; role?: UserRole };
}

const serviceWith = async (repo: Partial<Record<keyof UserRepo, unknown>>) => {
  const moduleRef = await Test.createTestingModule({
    providers: [UsersService, { provide: UserRepo, useValue: repo }],
  }).compile();
  return moduleRef.get(UsersService);
};

const prismaFailure = (code: string) =>
  new RepoError(
    'Failed',
    HttpStatus.INTERNAL_SERVER_ERROR,
    new Prisma.PrismaClientKnownRequestError('Prisma', { code, clientVersion: 'test' }),
  );

const rejecting = (error: unknown) => jest.fn(() => Promise.reject(error));

const capturing = () =>
  jest.fn((params: WriteParams) => Promise.resolve({ id: 'usr_1', ...params.data }));

const firstCall = (mock: ReturnType<typeof capturing>): WriteParams => {
  const [call] = mock.mock.calls;
  if (!call) throw new Error('expected the repo to be called');
  return call[0];
};

describe('UsersService.create', () => {
  it('answers 409 when the email is already registered', async () => {
    const service = await serviceWith({ create: rejecting(prismaFailure(UNIQUE_VIOLATION)) });

    await expect(service.create(DTO)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets any other failure through unchanged', async () => {
    const failure = new RepoError(
      'Failed to create user',
      HttpStatus.INTERNAL_SERVER_ERROR,
      new Error('connection lost'),
    );
    const service = await serviceWith({ create: rejecting(failure) });

    await expect(service.create(DTO)).rejects.toBe(failure);
  });

  it('never stores the plain password', async () => {
    const create = capturing();
    await (await serviceWith({ create })).create(DTO);

    const { data } = firstCall(create);
    expect(data).not.toHaveProperty('password');
    await expect(PasswordUtil.compare(DTO.password, data.passwordHash ?? '')).resolves.toBe(true);
  });
});

describe('UsersService.findOne', () => {
  it('answers 404 instead of an empty profile', async () => {
    const service = await serviceWith({ findUnique: jest.fn(() => Promise.resolve(null)) });

    await expect(service.findOne('usr_2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still lets the guard ask without throwing', async () => {
    const service = await serviceWith({ findUnique: jest.fn(() => Promise.resolve(null)) });

    await expect(service.findById('usr_2')).resolves.toBeNull();
  });
});

describe('UsersService.update', () => {
  it('refuses to let a member edit someone else', async () => {
    const update = capturing();
    const service = await serviceWith({ update });

    await expect(service.update(MEMBER, 'usr_2', { fullName: 'Mallory' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to let a member promote themselves', async () => {
    const service = await serviceWith({ update: capturing() });

    await expect(
      service.update(MEMBER, MEMBER.id, { role: UserRole.ADMIN }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a member edit their own profile', async () => {
    const update = capturing();
    await (await serviceWith({ update })).update(MEMBER, MEMBER.id, { bio: 'Analyst' });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("lets an admin change anyone's role", async () => {
    const update = capturing();
    await (await serviceWith({ update })).update(ADMIN, 'usr_2', { role: UserRole.ADMIN });

    expect(firstCall(update)).toMatchObject({
      where: { id: 'usr_2' },
      data: { role: UserRole.ADMIN },
    });
  });

  it('hashes a new password instead of handing it to Prisma', async () => {
    const update = capturing();
    await (await serviceWith({ update })).update(MEMBER, MEMBER.id, { password: 'new-password' });

    const { data } = firstCall(update);
    expect(data).not.toHaveProperty('password');
    await expect(PasswordUtil.compare('new-password', data.passwordHash ?? '')).resolves.toBe(true);
  });

  it('answers 404 for a user that does not exist', async () => {
    const service = await serviceWith({ update: rejecting(prismaFailure(RECORD_NOT_FOUND)) });

    await expect(service.update(ADMIN, 'usr_2', { bio: 'Analyst' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('answers 409 when the new email is taken', async () => {
    const service = await serviceWith({ update: rejecting(prismaFailure(UNIQUE_VIOLATION)) });

    await expect(
      service.update(MEMBER, MEMBER.id, { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('UsersService.remove', () => {
  it('answers 404 for a user that does not exist', async () => {
    const service = await serviceWith({ delete: rejecting(prismaFailure(RECORD_NOT_FOUND)) });

    await expect(service.remove('usr_2')).rejects.toBeInstanceOf(NotFoundException);
  });
});
