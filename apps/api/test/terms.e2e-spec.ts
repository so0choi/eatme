import { createE2eApp, E2eApp } from './support/e2e-app';
import { createAppleE2eApp } from './support/apple-e2e';

const SIGNUP = `mutation($input: CreateUserInput!) { signup(createUserInput: $input) { id } }`;
const PROFILE = `query { profile { termsAgreedAt termsVersion pushEnabled pushHour } }`;

describe('약관 동의 (e2e)', () => {
  describe('이메일 가입', () => {
    let ctx: E2eApp;
    const base = { email: 'cook@eatme.test', password: 'password123', name: '요리사' };

    beforeAll(async () => {
      ctx = await createE2eApp();
    });
    afterAll(() => ctx?.app.close());
    beforeEach(() => ctx.prisma.reset());

    it('agreeTerms가 없으면 BAD_REQUEST', async () => {
      const res = await ctx.gql(SIGNUP, { input: base });
      expect(res.errors?.length).toBeGreaterThan(0);
      expect(ctx.prisma.user.rows).toHaveLength(0);
    });

    it('agreeTerms가 false면 BAD_REQUEST', async () => {
      const res = await ctx.gql(SIGNUP, { input: { ...base, agreeTerms: false } });
      expect(res.errors?.[0].extensions?.code).toBe('BAD_REQUEST');
      expect(ctx.prisma.user.rows).toHaveLength(0);
    });

    it('동의하고 가입하면 termsAgreedAt/termsVersion이 저장되고 agreeTerms 컬럼은 저장하지 않는다', async () => {
      const token = await ctx.signupAndLogin();
      const res = await ctx.gql(PROFILE, undefined, token);

      expect(res.errors).toBeUndefined();
      expect(res.data.profile.termsVersion).toBe('2026-11');
      expect(res.data.profile.termsAgreedAt).toEqual(expect.any(String));
      expect(res.data.profile.pushEnabled).toBe(true);
      expect(res.data.profile.pushHour).toBe(9);
      expect(ctx.prisma.user.rows[0]).not.toHaveProperty('agreeTerms');
    });
  });

  describe('소셜 가입', () => {
    it('신규 소셜 유저는 termsAgreedAt이 null이고 agreeTerms 후 채워진다', async () => {
      const { ctx, appleLogin, identityToken } = await createAppleE2eApp();
      try {
        const login = await appleLogin({
          identityToken: await identityToken('social@privaterelay.appleid.com'),
        });
        const token = login.data.appleLogin.token.accessToken as string;

        const before = await ctx.gql(PROFILE, undefined, token);
        expect(before.data.profile.termsAgreedAt).toBeNull();
        expect(before.data.profile.termsVersion).toBeNull();

        const res = await ctx.gql(
          `mutation { agreeTerms { termsAgreedAt termsVersion } }`,
          undefined,
          token,
        );
        expect(res.errors).toBeUndefined();
        expect(res.data.agreeTerms.termsVersion).toBe('2026-11');
        expect(res.data.agreeTerms.termsAgreedAt).toEqual(expect.any(String));

        const after = await ctx.gql(PROFILE, undefined, token);
        expect(after.data.profile.termsAgreedAt).toEqual(expect.any(String));
      } finally {
        await ctx.app.close();
      }
    });
  });
});
