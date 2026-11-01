// DB 없이 GraphQL 전체 파이프라인(가드·ZodValidationPipe·예외 필터·리졸버·서비스)을 태우는 e2e.
// PrismaService만 in-memory 구현으로 교체한다.
process.env.JWT_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';

import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { PrismaService } from '@db/prisma.service';
import { ExceptionFilter } from '@/filters/global-exception.filter';
import { YoutubeService } from '@modules/youtube/youtube.service';
import { InMemoryPrisma } from './support/in-memory-prisma';

describe('GraphQL API (e2e)', () => {
  let app: NestFastifyApplication;
  const prisma = new InMemoryPrisma();

  async function gql<T = any>(query: string, variables?: Record<string, unknown>, token?: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: { query, variables },
    });
    return res.json() as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
  }

  async function signupAndLogin(email = 'cook@eatme.test', password = 'password123') {
    await gql(
      `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
      { input: { email, password, name: '요리사' } },
    );
    const res = await gql(
      `mutation($input: LoginDto!) { login(input: $input) { accessToken refreshToken expiresIn } }`,
      { input: { email, password } },
    );
    return res.data.login.accessToken as string;
  }

  const CREATE = `mutation($input: CreateIngredientInput!) {
    createIngredient(input: $input) { id name quantity unit storage status }
  }`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(YoutubeService)
      .useValue({ getShorts: async () => [] })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalFilters(new ExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app?.close());
  beforeEach(() => prisma.reset());

  describe('auth', () => {
    it('signup 후 login 하면 토큰과 세션을 발급한다', async () => {
      const token = await signupAndLogin();
      expect(token).toEqual(expect.any(String));
      expect(prisma.session.rows).toHaveLength(1);
      // 비밀번호는 해시로 저장된다
      expect(prisma.user.rows[0].password).not.toBe('password123');
    });

    it('같은 이메일로 다시 가입하면 CONFLICT', async () => {
      await signupAndLogin();
      const res = await gql(
        `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
        { input: { email: 'cook@eatme.test', password: 'password123', name: '중복' } },
      );
      expect(res.errors[0].extensions.code).toBe('CONFLICT');
    });

    it('zod 스키마 위반(짧은 비밀번호)은 거부된다', async () => {
      const res = await gql(
        `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`,
        { input: { email: 'short@eatme.test', password: '123', name: '짧음' } },
      );
      expect(res.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(prisma.user.rows).toHaveLength(0);
    });

    it('틀린 비밀번호는 UNAUTHENTICATED', async () => {
      await signupAndLogin();
      const res = await gql(`mutation { login(input: { email: "cook@eatme.test", password: "wrong-pass" }) { accessToken } }`);
      expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('토큰 없이 보호된 쿼리를 호출하면 거부된다', async () => {
      const res = await gql(`{ getAllIngredients { id } }`);
      expect(res.data).toBeNull();
      expect(res.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('logout 은 세션을 삭제한다', async () => {
      const token = await signupAndLogin();
      const res = await gql(`mutation { logout }`, undefined, token);
      expect(res.data.logout).toBe(true);
      expect(prisma.session.rows).toHaveLength(0);
    });
  });

  describe('ingredient CRUD', () => {
    it('생성 → 목록 → 수정 → 폐기 → 삭제', async () => {
      const token = await signupAndLogin();

      const created = await gql(
        CREATE,
        { input: { name: '감자', quantity: 500, unit: 'G', storage: 'PANTRY', price: 3000 } },
        token,
      );
      expect(created.errors).toBeUndefined();
      const id = created.data.createIngredient.id;
      expect(created.data.createIngredient).toMatchObject({ name: '감자', quantity: 500, unit: 'G', status: 'FRESH' });

      const list = await gql(`{ getAllIngredients { id name } }`, undefined, token);
      expect(list.data.getAllIngredients).toEqual([{ id, name: '감자' }]);

      const updated = await gql(
        `mutation($input: UpdateIngredientInput!) { updateIngredient(input: $input) { id quantity } }`,
        { input: { id, quantity: 250 } },
        token,
      );
      expect(updated.data.updateIngredient.quantity).toBe(250);

      const discarded = await gql(`mutation($id: Int!) { discardIngredient(id: $id) { lossAmount } }`, { id }, token);
      expect(discarded.data.discardIngredient.lossAmount).toBe(3000);
      expect(prisma.ingredient.rows[0].status).toBe('DISCARDED');

      const again = await gql(`mutation($id: Int!) { discardIngredient(id: $id) { lossAmount } }`, { id }, token);
      expect(again.errors[0].extensions.code).toBe('BAD_REQUEST');

      const removed = await gql(`mutation($id: Int!) { deleteIngredient(id: $id) }`, { id }, token);
      expect(removed.data.deleteIngredient).toBe(true);
      expect(prisma.ingredient.rows).toHaveLength(0);
    });

    it('다른 사용자의 재료는 조회·수정·삭제할 수 없다', async () => {
      const ownerToken = await signupAndLogin('owner@eatme.test');
      const { data } = await gql(CREATE, { input: { name: '우유', storage: 'FRIDGE' } }, ownerToken);
      const id = data.createIngredient.id;

      const otherToken = await signupAndLogin('other@eatme.test');
      const read = await gql(`query($id: Int!) { ingredient(id: $id) { id } }`, { id }, otherToken);
      expect(read.errors[0].extensions.code).toBe('NOT_FOUND');

      const del = await gql(`mutation($id: Int!) { deleteIngredient(id: $id) }`, { id }, otherToken);
      expect(del.errors[0].extensions.code).toBe('NOT_FOUND');
      expect(prisma.ingredient.rows).toHaveLength(1);

      const list = await gql(`{ getAllIngredients { id } }`, undefined, otherToken);
      expect(list.data.getAllIngredients).toEqual([]);
    });
  });
});
