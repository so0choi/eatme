import * as WebBrowser from 'expo-web-browser';

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:3000';

export type PolicyDocument = 'terms' | 'privacy';

/** 웹의 이용약관(/terms)·개인정보처리방침(/privacy)을 인앱 브라우저로 연다. */
export function openPolicy(document: PolicyDocument): void {
  WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/${document}`).catch((error) => {
    console.warn('[policy] 문서 열기 실패', error);
  });
}
