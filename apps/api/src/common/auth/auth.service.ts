import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

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

// 토큰 타입 클레임: 시크릿이 같거나 폴백돼도 access/refresh 혼용을 막는다.
export const TOKEN_TYPE_ACCESS = 'access';
export const TOKEN_TYPE_REFRESH = 'refresh';

export const ACCESS_TOKEN_EXPIRES_IN = 60 * 15; // 15분
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일
const REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN = 60 * 60 * 24 * 30; // 30일

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    if (!this.configService.get<string>('JWT_REFRESH_SECRET')) {
      // 미설정 시 @nestjs/jwt가 JWT_SECRET으로 폴백한다. typ 클레임으로 혼용은 막지만 별도 시크릿을 권장.
      this.logger.warn(
        'JWT_REFRESH_SECRET is not set; refresh tokens fall back to JWT_SECRET.',
      );
    }
  }

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

  async localLogin({ email, password, autologin, platform }: LoginDto) {
    const validUser = await this.validateUser({ email, password });
    return this.issueSession(
      validUser,
      Boolean(autologin),
      platform ?? undefined,
    );
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
  private async issueSession(
    user: UserModel,
    autologin: boolean,
    platform = 'web',
  ): Promise<LoginToken> {
    const { token, refreshExpiresAt } = this.signTokens(user, autologin);
    await this.prismaService.session.create({
      data: {
        userId: user.id,
        refreshToken: token.refreshToken,
        expiresAt: refreshExpiresAt,
        platform,
      },
    });
    return token;
  }

  /**
   * refresh token rotation.
   * refresh JWT 서명·만료를 검증하고, DB 세션이 존재·미만료일 때만 같은 행을 새 refresh token으로 교체한다.
   * 이미 교체된(재사용된) token이나 무효/만료 token, refresh 타입이 아닌 token은 UNAUTHENTICATED.
   * 세션의 platform은 그대로 유지한다.
   */
  async rotateSession(refreshToken: string): Promise<LoginToken> {
    let payload: CreateJwtTokenDto & { typ?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }
    if (payload.typ !== TOKEN_TYPE_REFRESH) {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    const session = await this.prismaService.session.findUnique({
      where: { refreshToken },
    });
    if (
      !session ||
      session.userId !== payload.id ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    const user = await this.prismaService.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }

    const { token, refreshExpiresAt } = this.signTokens(
      user,
      Boolean(payload.autologin),
    );
    // 이전 refresh token을 조건으로 교체 → 동시 요청 중 하나만 성공(재사용 방지).
    const { count } = await this.prismaService.session.updateMany({
      where: { id: session.id, refreshToken },
      data: {
        refreshToken: token.refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });
    if (count !== 1) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    return token;
  }

  private signTokens(user: UserModel, autologin: boolean) {
    const payload: CreateJwtTokenDto = {
      id: user.id,
      email: user.email,
      autologin,
    };
    const refreshExpiresIn = autologin
      ? REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN
      : REFRESH_TOKEN_EXPIRES_IN;
    const token: LoginToken = {
      accessToken: this.getAccessToken(payload),
      refreshToken: this.getRefreshToken(payload),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      refreshExpiresIn,
    };
    return {
      token,
      refreshExpiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    };
  }

  getAccessToken(createJwtTokenDto: CreateJwtTokenDto) {
    return this.jwtService.sign({
      ...createJwtTokenDto,
      typ: TOKEN_TYPE_ACCESS,
    });
  }

  getRefreshToken(payload: CreateJwtTokenDto) {
    // jti: 같은 초에 같은 payload로 발급돼도 refresh token이 겹치지 않게(Session.refreshToken unique).
    return this.jwtService.sign(
      { ...payload, typ: TOKEN_TYPE_REFRESH, jti: randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: payload.autologin
          ? REFRESH_TOKEN_EXPIRES_IN_AUTOLOGIN
          : REFRESH_TOKEN_EXPIRES_IN,
      },
    );
  }

  // 기기(세션) 단위 로그아웃: 해당 유저의 그 refresh token 세션만 삭제한다.
  async logout(userId: number, refreshToken: string): Promise<void> {
    await this.prismaService.session.deleteMany({
      where: { userId, refreshToken },
    });
  }
}
