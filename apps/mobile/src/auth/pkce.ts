// RFC 7636 PKCE(S256) 도우미. 암호 연산(난수·SHA-256)은 호출자가 넘겨 순수 함수로 유지한다.

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 표준 base64 → base64url(`+`→`-`, `/`→`_`, 패딩 제거). */
export function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 바이트 → base64url(패딩 없음). RN 런타임의 btoa/Buffer에 의존하지 않는다. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += BASE64URL_ALPHABET[b0 >> 2];
    out += BASE64URL_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += BASE64URL_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += BASE64URL_ALPHABET[b2 & 0x3f];
  }
  return out;
}

/** 32바이트 난수 → 43자 verifier(43–128자, unreserved 문자만). */
export function createCodeVerifier(randomBytes: Uint8Array): string {
  if (randomBytes.length < 32) throw new Error('code_verifier에는 32바이트 이상의 난수가 필요합니다.');
  return bytesToBase64Url(randomBytes);
}

/** code_challenge = base64url(SHA-256(verifier)). sha256Base64는 표준 base64 다이제스트를 돌려준다. */
export async function createCodeChallenge(
  verifier: string,
  sha256Base64: (input: string) => Promise<string>,
): Promise<string> {
  return base64ToBase64Url(await sha256Base64(verifier));
}

/** API가 받는 S256 challenge 형식(43자 base64url). */
export function isCodeChallenge(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
