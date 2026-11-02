# eatme-mobile

Eat me 모바일 앱 (Expo SDK 58, Expo Router, NativeWind). scheme `eatme`, 기본 번들 ID `com.eatme.app`.

## 로컬 실행

```bash
pnpm install                              # 루트에서
pnpm --filter @eatme/schemas build && pnpm --filter @eatme/core build
pnpm --filter eatme-back start:dev        # API (4000)
pnpm --filter eatme-mobile start          # Expo 개발 서버
pnpm verify                               # 루트: 전체 타입체크·테스트
```

환경변수(`apps/mobile/.env` 등): `EXPO_PUBLIC_API_BASE_URL`(기본 `http://localhost:4000`; 실기기는 PC의 LAN 주소 필요), `EXPO_PUBLIC_WEB_BASE_URL`(약관·개인정보 링크, 기본 `http://localhost:3000`), `EXPO_PUBLIC_SENTRY_DSN`(없으면 Sentry 생략), `APP_BUNDLE_ID`, `SENTRY_ORG`/`SENTRY_PROJECT`(소스맵 업로드용).

### Expo Go의 한계

Expo Go에서는 이메일 로그인·냉장고·레시피 등 기본 기능만 확인할 수 있다. **Sign in with Apple, 푸시 알림(원격), 커스텀 scheme 딥링크 왕복**은 development build(`eas build --profile development`)가 필요하다.

## EAS 빌드

`eas.json` 프로필: `development`(developmentClient, internal, channel development), `preview`(internal, channel preview), `production`(autoIncrement, channel production). `submit.production`은 비어 있어 계정 준비 후 채운다. EAS 빌드·제출은 CI에서 돌리지 않으며 사람이 실행한다.

```bash
eas build --profile development --platform ios
eas build --profile production --platform all
```

## 준비해야 할 계정·키

- Apple Developer Program, Google Play Console, Expo 계정
- 번들 ID 확정(`APP_BUNDLE_ID`; iOS bundleIdentifier와 Android package 공용)
- Expo/EAS 프로젝트: `eas init` 후 발급된 projectId를 `app.config.ts`의 `extra.eas.projectId`에 추가(푸시 토큰 발급에 필요, 현재 미설정)
- APNs 키 / FCM 자격증명: EAS가 관리(`eas credentials`)
- Sign in with Apple: Services/Key(.p8), Team ID, Key ID → API env `APPLE_PRIVATE_KEY`/`APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_BUNDLE_ID`
- Google OAuth 클라이언트(웹 + iOS + Android), 리디렉션 URI는 API `/auth/google/callback`
- 운영 API 도메인(HTTPS), DB 호스팅, 정책 문구 법률 검토, 앱 아이콘·스크린샷·설명문, 심사용 데모 계정, 지원 이메일(`SUPPORT_EMAIL`)
- API 쪽 `EXPO_ACCESS_TOKEN`, `APP_MIN_VERSION`/`APP_LATEST_VERSION`/스토어 URL(루트 `CLAUDE.md` 환경변수 목록 참고)

## 실기기 확인 체크리스트 (자동 테스트로 검증 불가)

- [ ] 푸시 수신: 알림 권한 허용 → `registerPushToken` 등록 → 유통기한 임박 재료로 설정한 시각(KST)에 요약 푸시 수신, 로그아웃 후 해당 기기에 푸시가 오지 않음
- [ ] Apple 로그인(iOS 실기기, development build): 신규 가입, 재로그인, 같은 이메일 연동 화면, 계정 삭제 후 Apple 연동 해제
- [ ] Google 로그인 딥링크 왕복: 인증 세션 안에서 API가 심은 nonce 쿠키가 콜백까지 유지되는지(iOS ASWebAuthenticationSession 포함), PKCE 교환 후 로그인 완료, 취소 시 `eatme://auth/callback?error=` 처리
- [ ] Android `eatme://link?ticket=…&provider=…` 딥링크가 연동 화면을 여는지
- [ ] 토큰 만료 후(15분) 자동 갱신, 강제 업데이트 화면(`APP_MIN_VERSION`), 약관 동의 게이트
