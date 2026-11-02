import * as WebBrowser from 'expo-web-browser';
import { apolloClient } from '../api/client';
import { exchangeGoogleCode, resetGoogleLogin, startGoogleLogin } from './google-login';

jest.mock('../api/client', () => ({
  API_BASE_URL: 'http://api.test',
  apolloClient: { mutate: jest.fn() },
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `eatme://${path}` }));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(n).fill(7),
  digestStringAsync: async () => 'c2hhMjU2LWRpZ2VzdC1wbGFjZWhvbGRlci12YWx1ZT0=',
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const mutate = apolloClient.mutate as jest.Mock;
const TOKEN = { accessToken: 'a', refreshToken: 'r', expiresIn: 900, refreshExpiresIn: 60 };

function sentVerifier(call: number): unknown {
  return mutate.mock.calls[call][0].variables.codeVerifier;
}

beforeEach(() => {
  resetGoogleLogin();
  openAuthSession.mockReset();
  mutate.mockReset();
});

describe('startGoogleLogin', () => {
  it('앱 루트를 반환 URL로 쓰고 platform을 함께 보낸다', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'eatme://link?ticket=t&provider=google' });
    await expect(startGoogleLogin()).resolves.toEqual({ kind: 'link', ticket: 't', provider: 'google' });
    const [url, returnUrl] = openAuthSession.mock.calls[0];
    expect(returnUrl).toBe('eatme://');
    expect(url).toMatch(/^http:\/\/api\.test\/auth\/google\?client=mobile&code_challenge=[\w-]+&platform=(ios|android)$/);
  });
});

describe('exchangeGoogleCode', () => {
  it('같은 code의 동시 교환은 한 번만 요청하고, 끝나면 verifier를 버린다', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await startGoogleLogin();
    mutate.mockResolvedValue({ data: { exchangeOAuthCode: TOKEN } });

    const [a, b] = await Promise.all([exchangeGoogleCode('c1'), exchangeGoogleCode('c1')]);
    expect(a).toBe(TOKEN);
    expect(b).toBe(TOKEN);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(typeof sentVerifier(0)).toBe('string');

    // 교환이 끝난 뒤의 호출은 공유되지 않고 verifier도 남아 있지 않다.
    await exchangeGoogleCode('c1');
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(sentVerifier(1)).toBeNull();
  });

  it('실패해도 verifier와 진행 상태를 버린다', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await startGoogleLogin();
    mutate.mockRejectedValueOnce(new Error('INVALID_OAUTH_CODE'));
    await expect(exchangeGoogleCode('c1')).rejects.toThrow('INVALID_OAUTH_CODE');

    mutate.mockResolvedValue({ data: { exchangeOAuthCode: TOKEN } });
    await exchangeGoogleCode('c1');
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(sentVerifier(1)).toBeNull();
  });

  it('resetGoogleLogin(로그인 화면 이탈) 후에는 verifier 없이 교환한다', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await startGoogleLogin();
    resetGoogleLogin();
    mutate.mockResolvedValue({ data: { exchangeOAuthCode: TOKEN } });
    await exchangeGoogleCode('c1');
    expect(sentVerifier(0)).toBeNull();
  });
});
