import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { CreateJwtTokenDto } from './dtos/createJwtToken.dto';
import { PrismaService } from '@db/prisma.service';
import { UserModel } from '@prisma/models/User';
import { Ok, Result } from '@common/types/result.type';

export interface OAuthUser {
  email: string;
  name?: string;
  provider: string;
}

export interface LoginToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export type OAuthLoginResult =
  | { kind: 'authenticated'; token: LoginToken }
  | {
      kind: 'link_required';
      email: string;
      provider: string;
      canPasswordLink: boolean;
      existingProviders: string[];
    };

export const ACCESS_TOKEN_EXPIRES_IN = 60 * 15; // 15분
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일
const REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN = 60 * 60 * 24 * 30; // 30일

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser({ email, password }: LoginDto): Promise<UserModel> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.compareHashOrThrow(password, user.password);
    return user;
  }

  async compareHashOrThrow(plain: string, hashed: string): Promise<void> {
    if (!(await bcrypt.compare(plain, hashed))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
  }

  async localLogin({ email, password, autologin }: LoginDto) {
    const validUser = await this.validateUser({ email, password });
    return this.issueSession(validUser, Boolean(autologin));
  }

  /**
   * 소셜 로그인 결과를 판별한다.
   * - 신규/이미 연동된 provider → 바로 인증(토큰 발급)
   * - 같은 이메일이 다른 방식으로 가입돼 있고 아직 미연동 → 연동 필요(link_required)
   *
   * REST 콜백에서 호출되므로 예외를 던지지 않고 결과 객체로 반환한다
   * (전역 ExceptionFilter가 GraphQL 전용이라 REST 예외는 응답이 안 나감).
   */
  async resolveOAuthLogin(inputUser: OAuthUser): Promise<OAuthLoginResult> {
    const user = await this.prismaService.user.findUnique({
      where: { email: inputUser.email },
    });

    // 신규 유저: 생성 후 바로 인증.
    if (!user) {
      const created = await this.prismaService.user.create({
        data: {
          email: inputUser.email,
          provider: inputUser.provider,
          providers: [inputUser.provider],
          // 소셜 계정은 로컬 비밀번호가 없으므로 로그인 불가능한 placeholder 저장.
          password: `${inputUser.provider}:${inputUser.email}:${Date.now()}`,
          name: inputUser.name || inputUser.email,
        },
      });
      return { kind: 'authenticated', token: await this.issueSession(created, true) };
    }

    // 이미 이 provider로 로그인 가능한 계정 → 바로 인증(필요 시 providers 자가 보정).
    if (this.linkedProviders(user).has(inputUser.provider)) {
      await this.ensureProviderLinked(user, inputUser.provider);
      return { kind: 'authenticated', token: await this.issueSession(user, true) };
    }

    // 미연동: 연동이 필요하다. local 비밀번호가 있어야 비밀번호 확인으로 연동 가능.
    return {
      kind: 'link_required',
      email: user.email,
      provider: inputUser.provider,
      canPasswordLink: this.linkedProviders(user).has('local'),
      existingProviders: [...this.linkedProviders(user)],
    };
  }

  /**
   * 소셜 계정을 기존(local) 계정에 연동한다. 기존 계정 비밀번호로 소유권을 증명한다.
   * 성공 시 provider를 계정에 추가하고 세션을 발급한다.
   */
  async linkSocialAccount(email: string, provider: string, password: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }
    // local 비밀번호로만 연동 소유권 증명 가능(순수 소셜 계정은 placeholder라 항상 실패).
    await this.compareHashOrThrow(password, user.password);
    await this.ensureProviderLinked(user, provider);
    return this.issueSession(user, true);
  }

  /** 계정에 연동된 인증수단 집합(원래 provider + providers 배열). */
  private linkedProviders(user: UserModel): Set<string> {
    return new Set<string>([user.provider, ...(user.providers ?? [])]);
  }

  /** providers 배열에 provider가 없으면 추가한다(멱등). */
  private async ensureProviderLinked(user: UserModel, provider: string) {
    if ((user.providers ?? []).includes(provider) || user.provider === provider) {
      return;
    }
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { providers: { set: [...this.linkedProviders(user), provider] } },
    });
  }

  /** 유저에게 access/refresh 토큰을 발급하고 Session 레코드를 생성한다. */
  private async issueSession(user: UserModel, autologin: boolean) {
    const payload = { id: user.id, email: user.email, autologin };

    const accessToken = this.getAccessToken(payload);
    const refreshToken = this.getRefreshToken(payload);

    const refreshExpiresIn = autologin
      ? REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN
      : REFRESH_TOKEN_EXPIRES_IN;
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    await this.prismaService.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      refreshExpiresIn,
    };
  }

  getAccessToken(createJwtTokenDto: CreateJwtTokenDto) {
    return this.jwtService.sign(createJwtTokenDto);
  }

  getRefreshToken(payload: CreateJwtTokenDto) {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: payload.autologin
        ? REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN
        : REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  async refreshAccessToken(token: string) {
    const session = await this.prismaService.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new NotFoundException('SESSION_EXPIRED');
    }

    const payload: CreateJwtTokenDto = {
      id: session.user.id,
      email: session.user.email,
      autologin:
        session.expiresAt >
        new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000),
    };

    return {
      accessToken: this.getAccessToken(payload),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  async logout(userId: number): Promise<void> {
    await this.prismaService.session.deleteMany({ where: { userId } });
  }
}
