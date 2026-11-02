# Eat me 모바일 v1 설계

- 작성일: 2026-11-03
- 상태: 승인됨 (섹션 1·2는 대화에서 승인, 3~6은 사용자가 "전부 권장안으로" 위임)
- 목표: **한 달 안에 App Store / Play Store 공개 출시**

## 0. 배경과 목표

Eat me는 개인 냉장고 관리 도구다(CLAUDE.md "서비스 성격"). 재료를 넣고 꺼내는 곳이 부엌·마트이고, 핵심 리텐션 루프가 "유통기한 임박 푸시"이므로 모바일 앱을 주 채널로 삼는다. 웹은 랜딩·데스크톱 보조·정책 페이지 호스팅으로 남는다.

### 성공 기준
- 스토어 심사를 통과한 iOS/Android 앱이 공개되어 있다.
- 사용자가 가입 → 첫 재료 입력 → 다음 날 유통기한 푸시 수신까지 끊김 없이 경험한다.
- `pnpm verify`(CI)가 core·api·web·mobile 타입체크/테스트를 모두 지킨다.

### v1 범위
| 구분 | 기능 |
|---|---|
| Must | 이메일/Google/Apple 로그인, 토큰 갱신, 기기 단위 세션, 약관 동의 저장, 계정 삭제, 온보딩·빈 상태, 냉장고 목록, 빠른 입력, 수정·사용·폐기, 유통기한 푸시(+사전 안내·설정), 레시피 추천, 월별 폐기 인사이트, 개인정보처리방침·이용약관 |
| Should(포함) | Sentry, 강제 업데이트 체크, 문의 링크, 로그인 rate-limit, 스와이프 사용/폐기 + 실행취소, 유통기한 규칙 16→약 80개, 레시피 보유/부족 표시 + "요리했어요" |
| 제외(v1.1+) | 네이버 로그인(모바일), 바코드, 쿠팡 메일 자동 입력, 공유 시트, 비밀번호 재설정, 소셜 연동 해제, Redis 기반 store |

**컷라인**: 3주차 종료 시점에 미완이면 "요리했어요"와 "스와이프 실행취소"는 v1.1로 넘긴다(일반 버튼으로 사용/폐기는 유지).

## 1. 전체 구조 (승인됨)

```
apps/api      NestJS — 인증·계정·푸시·appConfig 추가
apps/web      Next.js — 토큰 갱신, 약관 동의, 정책 페이지, @eatme/core 사용
apps/mobile   ★ Expo (Expo Router, Apollo Client, NativeWind)
packages/schemas  @eatme/schemas — API 입력 zod (그대로)
packages/core     ★ @eatme/core — 순수 도메인 로직(TS 소스 직접 소비)
```

- `@eatme/core`: 빠른 입력 파서, 쿠팡 메일 파서, 유통기한·카테고리 규칙, 레시피 보유/부족 매칭, 남은 일수 계산. React/플랫폼 의존 금지. 기존 테스트를 함께 이동(vitest).
- 의존 방향: `mobile → core, schemas`, `web → core, schemas`, `api → schemas`. core는 외부 import 없음.
- web은 `transpilePackages: ['@eatme/core']`로 TS 소스를 직접 사용. mobile은 Metro가 workspace 패키지를 해석.
- 코드젠: 루트 `codegen.ts`에 `apps/mobile/gql/` 출력 추가(문서 경로 `apps/mobile/src/**`).
- 위험: Expo(Metro) × pnpm 심볼릭 링크. 모바일 착수 첫 작업을 스파이크로 두고, 실패 시 `.npmrc node-linker=hoisted`로 우회(웹·API 설치 영향 확인 후).
- CI: `pnpm verify`에 core 테스트, mobile 타입체크·테스트 추가. EAS 빌드는 CI에서 돌리지 않는다.

## 2. 인증 (승인됨)

### 2.1 토큰 갱신·만료
- `refreshToken(refreshToken: String!): LoginToken` mutation(`@Public`). **rotation**: 유효한 세션이면 새 access/refresh 발급 후 기존 Session 행을 새 refresh로 교체(같은 platform 유지). 무효/만료면 `UNAUTHENTICATED`.
- `JwtStrategy.ignoreExpiration = false`. secret은 `ConfigService`로 읽는다(apps/api/CLAUDE.md 규칙).
- 웹: `proxy.ts`가 보호 경로에서 `bt-token`의 `expiresAt`이 지났거나 60초 이내면 API `refreshToken`을 호출하고 쿠키를 갱신. 실패 시 쿠키 삭제 후 `/login`. 보호 경로 matcher를 실제 `(app)` 경로(`/dashboard`, `/fridge`, `/recipes`, `/insights`)로 맞춘다.
- 모바일: 토큰은 `expo-secure-store`. Apollo `ErrorLink`가 `UNAUTHENTICATED`를 받으면 **single-flight** 갱신 후 원 요청 재시도, 갱신 실패 시 토큰 삭제 → 로그인 화면.

### 2.2 기기 단위 세션
- `Session.platform String @default("web")` 추가(값: web | ios | android). login/oauth/apple/refresh 입력에 optional `platform`.
- `logout(refreshToken: String!)`은 해당 세션만 삭제. (전체 로그아웃은 계정 삭제 시에만)
- 푸시 토큰은 Session에 1:N으로 연결(onDelete Cascade) → 로그아웃하면 그 기기의 푸시도 해제.

### 2.3 Google 로그인 (모바일)
- 앱이 `WebBrowser.openAuthSessionAsync(`${API}/auth/google?client=mobile`, 'eatme://auth/callback')`.
- API는 authorize 요청의 `state`를 **서명된 값**(JWT, 5분 만료, `{ client, nonce }`)으로 만들고 콜백에서 검증 → OAuth CSRF TODO 해결. 검증 실패 시 웹 `/login?error=invalid_state`(또는 모바일 딥링크 `?error=`).
- 콜백 리다이렉트 대상: `client=mobile`이면 `${MOBILE_REDIRECT_URI ?? 'eatme://'}auth/callback?code=…`, 연동 필요 시 `…link?ticket=…&provider=…`. 그 외는 기존 웹 경로.
- code 교환은 기존 `exchangeOAuthCode` 그대로. 네이버도 같은 경로로 동작은 하지만 v1 앱 UI에는 노출하지 않는다.

### 2.4 Sign in with Apple (iOS만)
- 앱: `expo-apple-authentication` → `identityToken`, `authorizationCode`, (최초 1회) 이름.
- `appleLogin(input: { identityToken, authorizationCode, name?, platform? }): AppleLoginResult` mutation(`@Public`).
  - `identityToken`을 Apple JWKS(`https://appleid.apple.com/auth/keys`)로 검증: `iss=https://appleid.apple.com`, `aud=APPLE_BUNDLE_ID`, 만료. `jose` 사용, JWKS 조회는 주입 가능한 provider로 분리(테스트에서 로컬 키로 대체).
  - email 클레임으로 기존 `resolveOAuthLogin({ provider: 'apple', … })` 재사용. 결과가 `link_required`면 `{ linkTicket, provider }`를 돌려주고 앱이 기존 연동 화면으로 이동.
  - `authorizationCode`를 Apple `/auth/token`으로 교환해 Apple refresh token을 `User.appleRefreshToken`에 저장(계정 삭제 시 revoke용). client secret은 `.p8` 키(ES256)로 서명한 JWT. 키 미설정 시 교환을 건너뛰고 경고 로그(개발 중 막히지 않게).
- 제약: 계정 식별은 이메일. Apple relay 주소도 앱별 고정이라 동작.

### 2.5 계정 삭제
- `deleteAccount: Boolean` mutation. 한 트랜잭션에서 PushToken → Session → IngredientDisposal → Ingredient → Review → 사용자가 작성한 Recipe는 `authorId`를 null로(공용 레시피 보존, 스키마상 optional) → User 삭제. **즉시 삭제**(유예 없음).
- Apple 연동 계정이면 트랜잭션 후 Apple `/auth/revoke` 호출(실패해도 삭제는 유지, 에러 로그).

### 2.6 약관 동의
- `User.termsAgreedAt DateTime?`, `User.termsVersion String?`. 현재 버전 상수 `TERMS_VERSION = '2026-11'`.
- 이메일 가입: `createUserSchema`에 `agreeTerms: z.literal(true)` 추가 → 가입 시 저장.
- 소셜 가입: 동의 없이 생성 → `profile { termsAgreedAt termsVersion }` 노출, 클라이언트가 로그인 직후 동의 화면으로 게이트 → `agreeTerms: User` mutation.
- 웹 `ConsentCheckboxGroup`을 실제 폼 값으로 연결.

## 3. 모바일 앱

### 3.1 스택
Expo SDK(최신 안정), Expo Router(파일 기반), Apollo Client 4, NativeWind(Tailwind 토큰을 `apps/web/AGENTS.md` 색상 토큰과 동일 이름으로 정의), `expo-secure-store`, `expo-notifications`, `expo-apple-authentication`, `expo-web-browser`, `react-native-gesture-handler`(스와이프), `@sentry/react-native`.
- 앱 이름 "Eat me", scheme `eatme`, 번들 ID 기본값 `com.eatme.app`(사람이 확정, `app.config.ts`에서 env로 덮어쓰기).
- API 주소: `EXPO_PUBLIC_API_BASE_URL`(기본 `http://localhost:4000`).

### 3.2 화면 구성
```
app/
  _layout.tsx            Apollo/Auth Provider, 폰트, Sentry, 업데이트 체크
  (auth)/login.tsx       이메일 + Google + Apple(iOS) 버튼
  (auth)/signup.tsx      약관 동의 포함
  (auth)/link.tsx        소셜 연동(기존 비밀번호 입력)
  (auth)/consent.tsx     소셜 가입자 약관 동의 게이트
  auth/callback.tsx      딥링크 code 교환
  onboarding.tsx         3장(빠른 입력 소개 → 유통기한 자동 추정 → 알림 가치)
  (tabs)/index.tsx       냉장고: 임박 섹션 + 보관위치별 목록, 스와이프 사용/폐기 + 실행취소 토스트, 빈 상태 CTA
  (tabs)/add.tsx         빠른 입력(@eatme/core 파서, 실시간 미리보기, 보관/카테고리 원탭 변경)
  (tabs)/recipes/index.tsx   추천 레시피(보유 비율 순)
  (tabs)/recipes/[id].tsx    보유/부족 재료 표시, "요리했어요" → 사용할 재료 선택 후 일괄 USED
  (tabs)/insights.tsx    월별 폐기 금액·건수
  (tabs)/settings.tsx    알림 on/off·시각, 약관/개인정보 링크, 문의, 로그아웃, 계정 삭제(2단계 확인)
  ingredient/[id].tsx    재료 수정
```
- 라우팅 가드: 토큰 없음 → `(auth)/login`; `termsAgreedAt` 없음 → `consent`; 온보딩 미완(SecureStore 플래그) → `onboarding`.
- 푸시 권한: 첫 재료 저장 직후 사전 안내 시트("유통기한 하루 전에 알려드릴까요?") → 동의 시 OS 권한 요청 → 토큰 등록.

### 3.3 데이터 흐름
- 모든 데이터는 GraphQL. 웹과 같은 mutation(createIngredient/updateIngredient/discardIngredient/deleteIngredient, monthlyIngredientWaste, recipes)을 재사용하고, 신규는 `bulkCreateIngredients`가 필요하면 추가(빠른 입력 다건 저장; 우선 기존 createIngredient 병렬 호출 + 부분 실패 처리로 시작 — 웹과 동일 패턴).
- "요리했어요": 선택된 재료마다 `updateIngredient(status: USED)` 호출. 실행취소: 직전 status로 되돌리는 `updateIngredient` (폐기 실행취소는 v1에서 제공하지 않음 — 폐기는 확인 다이얼로그로 대체, 스와이프 실행취소는 "사용함"에만 적용).
- Apollo 캐시: 재료 변경 후 `getAllIngredients` refetch(단순성 우선).

## 4. 유통기한 푸시

- 모델: `PushToken { id, token String @unique, platform, sessionId → Session(onDelete: Cascade), userId, createdAt }`.
- 사용자 설정: `User.pushEnabled Boolean @default(true)`, `User.pushHour Int @default(9)`(KST 0~23).
- API: `registerPushToken(token, platform)`(현재 세션에 연결; 같은 token이 있으면 소유 세션 갱신), `updateNotificationSettings(pushEnabled, pushHour)`, `profile`에 두 필드 노출.
- 발송: `ExpiryNotificationScheduler` — 매시 정각(KST) cron. `pushEnabled && pushHour == 현재 KST 시`인 사용자 중 `status IN (FRESH, EXPIRING_SOON)`이고 `expireAt`이 오늘~D+1(KST)인 재료가 있으면 **하루 1건 요약 알림**(예: "우유 외 2개가 내일까지예요"). D-3 임박은 앱 내 섹션으로만 노출(알림 피로 방지).
- 발송 클라이언트: `ExpoPushClient`(HTTP `https://exp.host/--/api/v2/push/send`, 100건 배치)를 provider로 분리 → 테스트에서 fake 주입. 응답 ticket의 `DeviceNotRegistered`면 해당 PushToken 삭제. (receipt 조회는 v1.1)
- 중복 발송 방지: `User.lastExpiryPushAt`이 오늘(KST)이면 건너뜀.

## 5. 운영·출시

- **rate-limit**: `@nestjs/throttler`(GraphQL 컨텍스트용 가드 확장)로 `login`, `signup`, `refreshToken`, `appleLogin`, `linkSocialAccount`에 IP당 분당 10회.
- **appConfig**: `appConfig: AppConfig`(`@Public`) — `minSupportedVersion`, `latestVersion`, `iosStoreUrl`, `androidStoreUrl`, `supportEmail`. 값은 `ConfigService`(env) 기본값 포함. 앱은 시작 시 비교해 `min` 미만이면 강제 업데이트 화면, `latest` 미만이면 1회 배너.
- **Sentry**: `@sentry/react-native`, DSN(`EXPO_PUBLIC_SENTRY_DSN`) 없으면 초기화 생략. API는 v1.1.
- **문의**: 설정 → `mailto:${supportEmail}`.
- **정책 페이지**: 웹 `(site)/privacy`, `(site)/terms` 정적 페이지. 초안 문구는 "법률 검토 필요" 배너와 함께 작성(수집 항목: 이메일·이름·식재료/가격·푸시 토큰·기기 플랫폼, 처리위탁: 호스팅·Expo·Sentry·Apple/Google 로그인, 보유: 탈퇴 시 즉시 삭제).
- **EAS**: `eas.json`(development / preview / production 프로필), `app.config.ts`. 실제 빌드·제출은 계정 준비 후 사람이 실행.
- **CORS**: 모바일 앱은 CORS 무관. 웹 오리진만 허용하도록 `main.ts`에 명시(현재 미설정).

## 6. 테스트·일정

### 테스트
- core: vitest(기존 36개 + 레시피 매칭·남은 일수 + 확장 규칙 샘플).
- api: e2e 하네스(in-memory Prisma)로 refresh rotation·만료 거부·기기별 로그아웃·state 검증·Apple 토큰 검증(로컬 JWKS)·계정 삭제 정리·약관 동의·푸시 스케줄러(fake clock + fake ExpoPushClient)·throttle·appConfig.
- web: 타입체크 + core 테스트. proxy 갱신 로직은 순수 함수로 분리해 단위 테스트.
- mobile: 타입체크 + jest-expo 단위 테스트(인증 링크 single-flight 갱신, 라우팅 가드 판정 함수). 화면 E2E(Maestro)는 v1.1.
- 실기기 확인 필요(사람): 푸시 수신, Apple 로그인, Google 딥링크 왕복.

### 일정(4주)
| 주 | 내용 |
|---|---|
| 1 | core 패키지, API 인증 전부(2장), Expo 스캐폴드 스파이크, 로그인/가입/동의 화면 |
| 2 | 냉장고·빠른 입력·수정·스와이프, 웹 갱신/동의/정책 페이지 |
| 3 | 푸시(백엔드+앱), 레시피(+요리했어요), 인사이트, 설정·계정 삭제, appConfig/Sentry/throttle — **주말 컷라인** |
| 4 | 실기기 QA, EAS 빌드, 스토어 메타데이터, 심사 제출·반려 대응 |

### 사람이 준비할 것 (막힘 없이 진행되도록 코드는 모두 env/placeholder로 동작)
Apple Developer·Google Play·Expo 계정, 번들 ID 확정, APNs 키/FCM(EAS가 관리), Sign in with Apple 키(.p8)·Team ID·Key ID, Google OAuth iOS/Android 클라이언트, 운영 API 도메인·HTTPS·DB 호스팅, 정책 문구 법률 검토, 앱 아이콘·스크린샷·설명문, 심사용 데모 계정, 지원 이메일.

## 7. DB 마이그레이션
로컬 DB가 없어 `migrate dev`를 실행할 수 없다. 스키마 변경은 `prisma migrate diff --from-schema-datamodel <이전> --to-schema-datamodel <신규> --script`로 SQL을 생성해 `prisma/migrations/<timestamp>_mobile_v1/migration.sql`로 커밋한다. CLAUDE.md에 "마이그레이션 필요"로 남아 있던 `User.providers`는 기존 마이그레이션에 없으므로 같은 파일에 `ADD COLUMN IF NOT EXISTS`로 포함한다.

## 7. 구현 중 변경된 결정

스펙 본문과 다를 때 아래가 우선한다.

- **@eatme/core 빌드**: TS 소스 직접 소비가 아니라 `@eatme/schemas`와 같은 `tsc` → `dist/`(CommonJS) 빌드. 루트 `verify`가 schemas 직후 core를 먼저 build. web `transpilePackages` 불필요, api(`nest build`)는 TS 소스를 런타임에 못 읽으므로 일반 의존성으로 사용, mobile Metro는 dist 사용.
- **토큰 `typ` 클레임**: access/refresh/OAuth state JWT에 서로 다른 `typ`을 두어 혼용을 막는다(JwtStrategy는 `typ !== 'access'` 거부).
- **access token에 `sid`**: `JwtStrategy.validate`가 해당 Session 존재를 확인 → 로그아웃·계정 삭제 시 access도 즉시 무효(요청당 DB 조회 1회).
- **refresh mutation에 platform 인자 없음**: rotation은 기존 세션의 platform을 유지.
- **OAuth CSRF(§2.3 보강)**: state 안의 nonce를 API 오리진 httpOnly 쿠키에 바인딩하고 콜백 가드가 passport 전에 검증. 제공자 취소(`?error=`)도 passport 전에 에러 리다이렉트. 모바일은 PKCE(S256) 추가(`code_challenge` 필수, `exchangeOAuthCode(code, codeVerifier)`). iOS 인증 세션에서 쿠키 유지 여부는 실기기 확인 필요.
- **rate-limit 클라이언트 키**: `req.ip` 우선(trustProxy 시 Fastify가 신뢰 프록시를 제거한 IP). `TRUST_PROXY` env로 설정.
- **남은 한계**: 웹 오리진으로 돌아오는 OAuth 홉은 브라우저에 미바인딩, `OAuthCodeStore`/`SocialLinkStore`는 단일 인스턴스, 푸시 cron은 다중 인스턴스에서 중복 발송 가능.

