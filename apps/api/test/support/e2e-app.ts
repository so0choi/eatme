// e2e 공용 부트스트랩: DB 없이 GraphQL 전체 파이프라인(가드·ZodValidationPipe·예외 필터·리졸버·서비스)을 태운다.
// PrismaService만 in-memory 구현으로 교체한다. JWT 시크릿은 AppModule 평가 전에 설정해야 하므로 import보다 먼저 둔다.
process.env.JWT_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
// 모든 요청이 같은 IP(127.0.0.1)라 기본 한도를 크게 올린다. rate-limit 자체는 ops e2e가 별도 앱으로 검증.
process.env.AUTH_THROTTLE_LIMIT ??= '1000';

import { Test, TestingModuleBuilder } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { PrismaService } from '@db/prisma.service';
import { ExceptionFilter } from '@/filters/global-exception.filter';
import { YoutubeService } from '@modules/youtube/youtube.service';
import { InMemoryPrisma } from './in-memory-prisma';

export type GqlResponse<T = any> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export interface E2eApp {
  app: NestFastifyApplication;
  prisma: InMemoryPrisma;
  gql: <T = any>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ) => Promise<GqlResponse<T>>;
  signupAndLogin: (email?: string, password?: string) => Promise<string>;
}

export async function createE2eApp(
  overrides?: (b: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<E2eApp> {
  const prisma = new InMemoryPrisma();

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(YoutubeService)
    .useValue({ getShorts: async () => [] });
  if (overrides) builder = overrides(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  app.useGlobalFilters(new ExceptionFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  async function gql<T = any>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ): Promise<GqlResponse<T>> {
    const res = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: { query, variables },
    });
    return res.json() as GqlResponse<T>;
  }

  /** 가입 후 로그인하고 accessToken을 돌려준다. */
  async function signupAndLogin(
    email = 'cook@eatme.test',
    password = 'password123',
  ) {
    await gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      {
        input: { email, password, name: '요리사', agreeTerms: true },
      },
    );
    const res = await gql(
      `mutation($input: LoginDto!) { login(input: $input) { accessToken refreshToken expiresIn } }`,
      { input: { email, password } },
    );
    return res.data.login.accessToken as string;
  }

  return { app, prisma, gql, signupAndLogin };
}
