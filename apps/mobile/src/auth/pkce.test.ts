import {
  base64ToBase64Url,
  bytesToBase64Url,
  createCodeChallenge,
  createCodeVerifier,
  isCodeChallenge,
} from './pkce';

// 테스트 런타임(Node)의 Web Crypto·btoa로 기대값을 만든다(앱은 expo-crypto 사용).
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const sha256Base64 = async (input: string) =>
  toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))));
const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

describe('base64ToBase64Url', () => {
  it('+, /를 치환하고 패딩을 제거한다', () => {
    expect(base64ToBase64Url('a+b/c==')).toBe('a-b_c');
    expect(base64ToBase64Url('abcd')).toBe('abcd');
  });
});

describe('bytesToBase64Url', () => {
  it('표준 base64를 URL 안전하게 바꾼 값과 같다(길이별 패딩 경계 포함)', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 31, 32, 33]) {
      const bytes = randomBytes(length);
      expect(bytesToBase64Url(bytes)).toBe(base64ToBase64Url(toBase64(bytes)));
    }
  });

  it('+ / 로 인코딩될 바이트도 URL 안전 문자로 바꾼다', () => {
    expect(bytesToBase64Url(new Uint8Array([0xfb, 0xff, 0xbf]))).toBe('-_-_');
  });
});

describe('createCodeVerifier', () => {
  it('32바이트 난수로 RFC 7636 형식(43자 unreserved) verifier를 만든다', () => {
    const verifier = createCodeVerifier(randomBytes(32));
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    expect(verifier).toHaveLength(43);
  });

  it('난수가 32바이트 미만이면 거부한다', () => {
    expect(() => createCodeVerifier(new Uint8Array(16))).toThrow();
  });
});

describe('createCodeChallenge', () => {
  it('RFC 7636 부록 B 예시 값과 일치한다', async () => {
    const challenge = await createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', sha256Base64);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('API가 요구하는 43자 base64url 형식이다', async () => {
    const verifier = createCodeVerifier(randomBytes(32));
    const challenge = await createCodeChallenge(verifier, sha256Base64);
    expect(isCodeChallenge(challenge)).toBe(true);
  });
});

describe('isCodeChallenge', () => {
  it('패딩·표준 base64 문자·길이 오류를 거부한다', () => {
    expect(isCodeChallenge('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(true);
    expect(isCodeChallenge('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw+cM')).toBe(false);
    expect(isCodeChallenge('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM=')).toBe(false);
    expect(isCodeChallenge('short')).toBe(false);
  });
});
