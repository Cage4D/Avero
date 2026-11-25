import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JWT_ALGORITHM, privateKeyFrom, publicKeyFrom } from '../../../common/config/jwt-keys.js';
import { JWT_EXPIRES_IN } from '../../../common/enums/auth.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: privateKeyFrom(config),
        publicKey: publicKeyFrom(config),
        signOptions: { algorithm: JWT_ALGORITHM, expiresIn: JWT_EXPIRES_IN },
        verifyOptions: { algorithms: [JWT_ALGORITHM] },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
