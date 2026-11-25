import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator.js';
import { INVALID_CREDENTIALS, USER_EXISTS } from '../../../common/enums/auth.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto, LoginDto, RegisterDto } from './dto/index.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiEnvelope(AuthResponseDto, { status: HttpStatus.CREATED })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: USER_EXISTS })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and get a JWT' })
  @ApiEnvelope(AuthResponseDto)
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: INVALID_CREDENTIALS })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
