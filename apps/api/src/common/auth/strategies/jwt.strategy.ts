import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOKEN_TYPE_ACCESS } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // refresh token 등 access 타입이 아닌 토큰은 Bearer로 받지 않는다.
    if (payload.typ !== TOKEN_TYPE_ACCESS) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
    return { id: payload.id, email: payload.email };
  }
}
