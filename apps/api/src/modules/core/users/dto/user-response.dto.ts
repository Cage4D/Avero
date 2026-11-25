import { ApiProperty } from '@nestjs/swagger';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { UserAccountStatus, UserRole } from '../../../../generated/prisma/enums.js';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatar!: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty({ enum: UserAccountStatus, enumName: 'UserAccountStatus' })
  status!: UserAccountStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastActive!: string | null;
}

export const userSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  avatar: true,
  bio: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastActive: true,
} as const satisfies Record<keyof UserResponseDto, true>;

export type UserResponse = Prisma.UserGetPayload<{ select: typeof userSelect }>;
