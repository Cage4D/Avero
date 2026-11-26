import { UsersService } from './users.service';
import { UserRole } from 'generated/prisma/enums';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import {
    CurrentUser,
    JwtAuthGuard,
    Roles,
    RolesGuard,
    type AuthUser,
} from '@common/security';
import { ApiEnvelope } from '@common/decorators/api-envelope.decorator';
import { PageQueryDto } from '@common/dto';
import { uuidPipe } from '@common/pipes/uuid.pipe';
import {
    ADMIN_ONLY_FIELDS,
    OWN_PROFILE_ONLY,
    USER_EXISTS,
    USER_NOT_FOUND,
} from '@common/enums/auth';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
    ApiResponse,
} from '@nestjs/swagger';

import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Create a new user (Admin only)' })
    @ApiEnvelope(UserResponseDto, { status: 201 })
    @ApiResponse({ status: 409, description: USER_EXISTS })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiEnvelope(UserResponseDto, { isArray: true })
    findAll(@Query() page: PageQueryDto) {
        return this.usersService.findAll(page);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiEnvelope(UserResponseDto)
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    getMe(@CurrentUser() user: AuthUser) {
        return this.usersService.findOne(user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelope(UserResponseDto)
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    findOne(@Param('id', uuidPipe) id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update user profile' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelope(UserResponseDto)
    @ApiResponse({
        status: 403,
        description: `${OWN_PROFILE_ONLY}. ${ADMIN_ONLY_FIELDS}.`,
    })
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    @ApiResponse({ status: 409, description: USER_EXISTS })
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', uuidPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        return this.usersService.update(user, id, updateUserDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Delete user (Admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiEnvelope(UserResponseDto)
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    remove(@Param('id', uuidPipe) id: string) {
        return this.usersService.remove(id);
    }
}
