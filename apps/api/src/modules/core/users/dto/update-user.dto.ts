import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserAccountStatus } from '../../../../generated/prisma/enums.js';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ enum: UserAccountStatus, enumName: 'UserAccountStatus', required: false })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  status?: UserAccountStatus;
}
