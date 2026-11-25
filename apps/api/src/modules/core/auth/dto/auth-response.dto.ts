import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/enums.js';

export class AuthResponseUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthResponseUserDto })
  user!: AuthResponseUserDto;

  @ApiProperty()
  accessToken!: string;
}
