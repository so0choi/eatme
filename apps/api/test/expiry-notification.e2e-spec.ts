// 유통기한 요약 푸시: 대상 선정(KST 시/요일 경계)·문구·중복 방지·DeviceNotRegistered 정리 e2e.
import { createE2eApp, E2eApp } from './support/e2e-app';
import { EXPO_PUSH_CLIENT } from '@modules/notification/expo-push.client';
import { ExpiryNotificationService } from '@modules/notification/expiry-notification.service';

type Msg = { to: string; title: string; body: string; data?: object };

describe('Expiry notification (e2e)', () => {
  let ctx: E2eApp;
  let sent: Msg[];
  let tickets: (msgs: Msg[]) => any[];
  let service: ExpiryNotificationService;

  // KST 11/3 09:00
  const NOW = new Date('2026-11-03T00:00:00Z');
  const TOKEN = 'ExponentPushToken[abc]';

  async function seedUser(over: Record<string, unknown> = {}) {
    const user = await ctx.prisma.user.create({
      data: {
        email: `u${Math.random()}@eatme.test`,
        pushEnabled: true,
        pushHour: 9,
        lastExpiryPushAt: null,
        ...over,
      },
    });
    const session = await ctx.prisma.session.create({
      data: { userId: user.id, refreshToken: `r${Math.random()}`, expiresAt: new Date('2027-01-01') },
    });
    await ctx.prisma.pushToken.create({
      data: { token: TOKEN, platform: 'ios', sessionId: session.id, userId: user.id },
    });
    return user;
  }

  function seedIngredient(userId: number, name: string, expireAt: string, status = 'FRESH') {
    return ctx.prisma.ingredient.create({
      data: { userId, name, expireAt: new Date(expireAt), status },
    });
  }

  beforeAll(async () => {
    ctx = await createE2eApp((b) =>
      b.overrideProvider(EXPO_PUSH_CLIENT).useValue({
        send: async (msgs: Msg[]) => {
          sent.push(...msgs);
          return tickets(msgs);
        },
      }),
    );
    service = ctx.app.get(ExpiryNotificationService);
  });
  afterAll(() => ctx?.app.close());
  beforeEach(() => {
    ctx.prisma.reset();
    sent = [];
    tickets = (msgs) => msgs.map(() => ({ status: 'ok' }));
  });

  it('내일 만료 1개면 1건을 보내고 본문이 일치한다', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');

    expect(await service.run(NOW)).toEqual({ sent: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: TOKEN,
      title: '유통기한 알림',
      body: '우유이(가) 내일까지예요',
    });
    expect(ctx.prisma.user.rows[0].lastExpiryPushAt).toEqual(NOW);
  });

  it('오늘 만료 1개는 "오늘까지예요"', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '두부', '2026-11-03T10:00:00Z');
    await service.run(NOW);
    expect(sent[0].body).toBe('두부이(가) 오늘까지예요');
  });

  it('여러 개면 첫 이름 외 n-1개 문구', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '우유', '2026-11-03T10:00:00Z');
    await seedIngredient(user.id, '계란', '2026-11-04T03:00:00Z');
    await seedIngredient(user.id, '두부', '2026-11-04T03:00:00Z');
    await service.run(NOW);
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatch(/^.+ 외 2개가 곧 만료돼요$/);
  });

  it('pushHour가 다르면 보내지 않는다', async () => {
    const user = await seedUser({ pushHour: 8 });
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');
    expect(await service.run(NOW)).toEqual({ sent: 0 });
    expect(sent).toHaveLength(0);
  });

  it('pushEnabled=false면 보내지 않는다', async () => {
    const user = await seedUser({ pushEnabled: false });
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');
    expect(await service.run(NOW)).toEqual({ sent: 0 });
  });

  it('같은 날 두 번 실행하면 두 번째는 0건', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');
    expect(await service.run(NOW)).toEqual({ sent: 1 });
    expect(await service.run(new Date('2026-11-03T00:30:00Z'))).toEqual({ sent: 0 });
    expect(sent).toHaveLength(1);
  });

  it('KST 경계: UTC로는 11/3이지만 KST 11/4 01:00 만료는 내일로 포함된다', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '우유', '2026-11-03T16:00:00Z');
    expect(await service.run(NOW)).toEqual({ sent: 1 });
    expect(sent[0].body).toBe('우유이(가) 내일까지예요');
  });

  it('모레 만료·이미 지난 재료·USED 상태는 제외한다', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, 'A', '2026-11-05T03:00:00Z');
    await seedIngredient(user.id, 'B', '2026-11-02T03:00:00Z');
    await seedIngredient(user.id, 'C', '2026-11-04T03:00:00Z', 'USED');
    expect(await service.run(NOW)).toEqual({ sent: 0 });
    expect(ctx.prisma.user.rows[0].lastExpiryPushAt).toBeNull();
  });

  it('푸시 토큰이 없으면 보내지 않고 lastExpiryPushAt도 건드리지 않는다', async () => {
    const user = await seedUser();
    ctx.prisma.pushToken.rows = [];
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');
    expect(await service.run(NOW)).toEqual({ sent: 0 });
    expect(ctx.prisma.user.rows[0].lastExpiryPushAt).toBeNull();
  });

  it('DeviceNotRegistered ticket이면 해당 토큰을 삭제한다', async () => {
    const user = await seedUser();
    await seedIngredient(user.id, '우유', '2026-11-04T03:00:00Z');
    tickets = (msgs) =>
      msgs.map(() => ({ status: 'error', details: { error: 'DeviceNotRegistered' } }));
    await service.run(NOW);
    expect(ctx.prisma.pushToken.rows).toHaveLength(0);
  });
});
