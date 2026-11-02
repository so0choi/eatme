import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import 'module-alias/register';
import { config } from 'dotenv';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WinstonService } from '@common/logger/winston.service';
import { parseTrustProxy } from '@common/guards/client-key';
import { ConfigService } from '@nestjs/config';
import { ExceptionFilter } from './filters/global-exception.filter';

config();

async function bootstrap() {
  // Nest DI 이전에 어댑터를 만들므로 여기서만 process.env를 직접 읽는다(ConfigService 불가).
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy }),
  );
  app.useLogger(app.get(WinstonService));
  if (trustProxy === true || typeof trustProxy === 'number') {
    new Logger('Bootstrap').warn(
      'TRUST_PROXY가 true/홉 수로 설정됨 — 위조된 X-Forwarded-For로 rate-limit을 우회할 수 있다. 내부 프록시 CIDR 목록을 권장.',
    );
  }
  app.useGlobalFilters(new ExceptionFilter());

  app.enableCors({
    origin:
      app.get(ConfigService).get('WEB_BASE_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(4000);
}
bootstrap();
