import { NestFactory } from '@nestjs/core';
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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Nest DI 이전에 어댑터를 만들므로 여기서만 process.env를 직접 읽는다(ConfigService 불가).
    new FastifyAdapter({
      trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    }),
  );
  app.useLogger(app.get(WinstonService));
  app.useGlobalFilters(new ExceptionFilter());

  app.enableCors({
    origin:
      app.get(ConfigService).get('WEB_BASE_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(4000);
}
bootstrap();
