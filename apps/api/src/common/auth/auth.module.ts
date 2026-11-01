import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../modules/user/users.module';
import { config } from 'dotenv';
import { AuthController } from './auth.controller';
import { AuthResolver } from './auth.resolver';

import { ACCESS_TOKEN_EXPIRES_IN, AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { NaverStrategy } from './strategies/naver.strategy';
import { OAuthCodeStore } from './oauth-code.store';
import { SocialLinkStore } from './social-link.store';
import { OAuthStateService } from './oauth-state';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AppleIdentityService,
  appleJwksProvider,
} from './apple/apple-identity.service';
import { AppleTokenClient } from './apple/apple-token.client';

config();

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    GoogleStrategy,
    NaverStrategy,
    OAuthCodeStore,
    SocialLinkStore,
    OAuthStateService,
    appleJwksProvider,
    AppleIdentityService,
    AppleTokenClient,
  ],
})
export class AuthModule {}
