import { createE2eApp, E2eApp } from './support/e2e-app';

describe('ops: rate-limit / appConfig', () => {
  let ctx: E2eApp;
  const prevLimit = process.env.AUTH_THROTTLE_LIMIT;

  beforeAll(async () => {
    process.env.AUTH_THROTTLE_LIMIT = '10';
    ctx = await createE2eApp();
  });
  afterAll(async () => {
    await ctx.app.close();
    if (prevLimit === undefined) delete process.env.AUTH_THROTTLE_LIMIT;
    else process.env.AUTH_THROTTLE_LIMIT = prevLimit;
  });

  it('같은 IP로 login 11회 시 11번째는 TOO_MANY_REQUESTS', async () => {
    const q = `mutation($input: LoginDto!) { login(input: $input) { accessToken } }`;
    const vars = {
      input: { email: 'nobody@eatme.test', password: 'wrong-pass1' },
    };
    for (let i = 0; i < 10; i++) {
      const res = await ctx.gql(q, vars);
      expect(res.errors?.[0].extensions?.code).not.toBe('TOO_MANY_REQUESTS');
    }
    const res = await ctx.gql(q, vars);
    expect(res.errors?.[0].extensions?.code).toBe('TOO_MANY_REQUESTS');
  });

  it('appConfig는 비로그인으로 기본값을 돌려준다', async () => {
    const res = await ctx.gql(
      `{ appConfig { minSupportedVersion latestVersion iosStoreUrl androidStoreUrl supportEmail } }`,
    );
    expect(res.errors).toBeUndefined();
    expect(res.data.appConfig).toEqual({
      minSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      iosStoreUrl: null,
      androidStoreUrl: null,
      supportEmail: 'support@eatme.app',
    });
  });
});
