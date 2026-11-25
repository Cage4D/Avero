import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator.js';
import {
  ADMIN_ONLY_FIELDS,
  OWN_PROFILE_ONLY,
  USER_EXISTS,
  USER_NOT_FOUND,
} from '../../../common/enums/auth.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth.types.js';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/index.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiEnvelope(UserResponseDto, { status: HttpStatus.CREATED })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: USER_EXISTS })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiEnvelope(UserResponseDto, { isArray: true })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiEnvelope(UserResponseDto)
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: USER_NOT_FOUND })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiEnvelope(UserResponseDto)
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: USER_NOT_FOUND })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a user profile' })
  @ApiEnvelope(UserResponseDto)
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: `${OWN_PROFILE_ONLY}. ${ADMIN_ONLY_FIELDS}.`,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: USER_NOT_FOUND })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: USER_EXISTS })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiEnvelope(UserResponseDto)
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: USER_NOT_FOUND })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
