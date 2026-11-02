import { AppleTokenClient } from '@common/auth/apple/apple-token.client';
import { createE2eApp, E2eApp } from './support/e2e-app';

describe('Account deletion (e2e)', () => {
  let ctx: E2eApp;
  const revoke = jest.fn<Promise<void>, [string]>();

  const DELETE = `mutation { deleteAccount }`;
  const PROFILE = `query { profile { id email } }`;

  beforeAll(async () => {
    ctx = await createE2eApp((b) =>
      b.overrideProvider(AppleTokenClient).useValue({ revoke }),
    );
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    ctx.prisma.reset();
    revoke.mockReset();
    revoke.mockResolvedValue(undefined);
  });

  async function seedUserData(userId: number) {
    const p = ctx.prisma;
    await p.session.create({ data: { userId, refreshToken: `rt-${userId}` } });
    const session = p.session.rows.find((r) => r.userId === userId);
    await p.pushToken.create({
      data: { userId, sessionId: session.id, token: `pt-${userId}`, platform: 'ios' },
    });
    await p.ingredient.create({ data: { userId, name: '우유', storage: 'FRIDGE' } });
    await p.ingredientDisposal.create({ data: { userId, name: '두부' } });
    await p.review.create({ data: { authorId: userId, title: 't', content: 'c' } });
    await p.recipe.create({ data: { authorId: userId, title: '레시피' } });
  }

  const countFor = (userId: number) => {
    const p = ctx.prisma;
    return {
      session: p.session.rows.filter((r) => r.userId === userId).length,
      pushToken: p.pushToken.rows.filter((r) => r.userId === userId).length,
      ingredient: p.ingredient.rows.filter((r) => r.userId === userId).length,
      disposal: p.ingredientDisposal.rows.filter((r) => r.userId === userId).length,
      review: p.review.rows.filter((r) => r.authorId === userId).length,
    };
  };

  it('유저 데이터를 모두 지우고 타 유저 데이터·레시피는 유지하며 이후 토큰 요청은 실패한다', async () => {
    const token = await ctx.signupAndLogin('a@eatme.test');
    const otherToken = await ctx.signupAndLogin('b@eatme.test');
    const [a, b] = ctx.prisma.user.rows;
    await seedUserData(a.id);
    await seedUserData(b.id);

    const res = await ctx.gql(DELETE, undefined, token);
    expect(res.errors).toBeUndefined();
    expect(res.data.deleteAccount).toBe(true);

    expect(ctx.prisma.user.rows.find((u) => u.id === a.id)).toBeUndefined();
    expect(countFor(a.id)).toEqual({
      session: 0, pushToken: 0, ingredient: 0, disposal: 0, review: 0,
    });
    expect(countFor(b.id)).toEqual({
      session: 2, pushToken: 1, ingredient: 1, disposal: 1, review: 1,
    });
    expect(ctx.prisma.recipe.rows).toHaveLength(2);
    expect(ctx.prisma.recipe.rows.filter((r) => r.authorId === null)).toHaveLength(1);
    expect(ctx.prisma.recipe.rows.filter((r) => r.authorId === b.id)).toHaveLength(1);
    expect(revoke).not.toHaveBeenCalled();

    const after = await ctx.gql(PROFILE, undefined, token);
    expect(after.errors?.length).toBeGreaterThan(0);
    expect(after.data?.profile ?? null).toBeNull();
    const other = await ctx.gql(PROFILE, undefined, otherToken);
    expect(other.data.profile.email).toBe('b@eatme.test');
  });

  it('Apple 연동 계정이면 저장된 refresh token으로 revoke를 호출한다', async () => {
    const token = await ctx.signupAndLogin('apple@eatme.test');
    await ctx.prisma.user.update({
      where: { email: 'apple@eatme.test' },
      data: { appleRefreshToken: 'apple-rt' },
    });

    const res = await ctx.gql(DELETE, undefined, token);
    expect(res.data.deleteAccount).toBe(true);
    expect(revoke).toHaveBeenCalledWith('apple-rt');
  });

  it('revoke가 실패해도 삭제는 완료되고 true를 반환한다', async () => {
    const token = await ctx.signupAndLogin('apple2@eatme.test');
    await ctx.prisma.user.update({
      where: { email: 'apple2@eatme.test' },
      data: { appleRefreshToken: 'apple-rt' },
    });
    revoke.mockRejectedValue(new Error('apple down'));

    const res = await ctx.gql(DELETE, undefined, token);
    expect(res.errors).toBeUndefined();
    expect(res.data.deleteAccount).toBe(true);
    expect(ctx.prisma.user.rows).toHaveLength(0);
  });

  it('인증 없이는 호출할 수 없다', async () => {
    const res = await ctx.gql(DELETE);
    expect(res.errors?.length).toBeGreaterThan(0);
  });
});
