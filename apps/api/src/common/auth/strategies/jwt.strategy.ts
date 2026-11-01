import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@db/prisma.service';
import { TOKEN_TYPE_ACCESS } from '../auth.service';

export interface AuthenticatedUser {
  id: number;
  email: string;
  /** access token을 발급한 Session id. */
  sid: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<AuthenticatedUser> {
    // refresh token 등 access 타입이 아닌 토큰은 Bearer로 받지 않는다.
    if (payload.typ !== TOKEN_TYPE_ACCESS) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
    // 세션에 묶이지 않은(sid 없음) 토큰은 거부. 세션이 삭제되면(logout·계정 삭제) 즉시 무효.
    if (typeof payload.sid !== 'number') {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
    const session = await this.prismaService.session.findUnique({
      where: { id: payload.sid },
    });
    if (!session || session.userId !== payload.id) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    return { id: payload.id, email: payload.email, sid: payload.sid };
  }
}
