# Eat me 프로젝트

냉장고 식재료를 관리하고, 보유 재료 기반으로 레시피를 추천받는 서비스. 서비스의 주 목적은 식재료 관리이다.

## 서비스 성격 (Product Direction)

**개인화된 냉장고 관리 도구**이지, 콘텐츠 판매/광고형 서비스가 아니다. 기능을 추가할 때 항상 이 방향을 전제로 판단한다.

- **개인 냉장고 우선(fridge-first)**: 로그인 사용자는 진입 즉시 자신의 냉장고/재료 상태를 본다. 루트(`/`)는 로그인 시 `/dashboard`(개인 냉장고), 비로그인 시 `/login`으로 리다이렉트한다.
- **개인화된 데이터 중심**: 화면의 주인공은 "내 재료·내 유통기한·내 보유 재료로 만들 수 있는 레시피"다. 타 유저의 리뷰·랭킹·커뮤니티 같은 광고/소셜 콘텐츠를 전면에 내세우지 않는다.
- **마케팅 페이지는 보조**: 기존 판매성 랜딩은 `/welcome`에 보존되어 있으며 비로그인 사용자만 접근하는 보조 페이지다. 주요 흐름의 중심이 아니다.
- 새 기능은 "이 기능이 사용자 개인의 식재료 관리를 더 낫게 하는가?"를 우선 기준으로 검토한다.

## 모노레포 구조

pnpm workspace 기반 모노레포 (`pnpm-workspace.yaml`).

```text
eat-me/
├─ apps/
│  ├─ web/      # 프론트엔드 (Next.js 16 App Router)
│  ├─ api/      # 백엔드 (NestJS 11 + GraphQL)
│  └─ mobile/   # 모바일 앱 (eatme-mobile, Expo SDK 58 + Expo Router + NativeWind)
├─ packages/
│  ├─ schemas/  # @eatme/schemas — web/api 공유 zod 스키마
│  └─ core/     # @eatme/core — 순수 도메인 로직(빠른 입력 파서, 유통기한 규칙, 레시피 매칭 등)
└─ codegen.ts   # GraphQL → TS 타입/훅 코드젠 설정
```

- 패키지 매니저: **pnpm** (workspace). 루트 `package.json`의 `workspaces`는 npm 호환용이며 실제 워크스페이스 정의는 `pnpm-workspace.yaml`.
- 공유 스키마 `packages/schemas`는 `@eatme/schemas`로 발행되며 `apps/api`에서 `workspace:*`로 의존. 빌드 산출물(`dist`)을 사용하므로 스키마 수정 후 `pnpm --filter @eatme/schemas build` 필요.
- `packages/core`(`@eatme/core`)도 schemas와 같은 방식(`tsc` → `dist/` CommonJS, `main: dist/index.js`)으로 빌드한다. core 수정 후 `pnpm --filter @eatme/core build` 필요. web/api/mobile이 공유하며 React/플랫폼 의존 금지.

## 기술 스택

### apps/web (`eatme-front`)

- **Next.js 16** App Router, **React 19**
- **Apollo Client 4** + `@apollo/client-integration-nextjs` (서버 컴포넌트/RSC 연동)
- **Tailwind CSS v4** (`@theme` 토큰), shadcn / radix-ui, lucide-react
- **zod 4** 폼 검증, `react-day-picker` 날짜 입력
- GraphQL 타입은 루트 `pnpm generate`로 `apps/web/gql/`에 자동 생성

### apps/api (`eatme-back`)

- **NestJS 11** + **Fastify** 어댑터 (포트 `4000`)
- **GraphQL** code-first (`@nestjs/graphql` + Apollo Driver, `autoSchemaFile`, playground 비활성 + Landing Page 플러그인)
- **Prisma 7** (PostgreSQL, 클라이언트 출력 `apps/api/generated/prisma`)
- **인증**: Passport (local / JWT / Google OAuth20 / Naver OAuth2), `@nestjs/jwt`, bcrypt
- **검증**: `nestjs-zod`의 `ZodValidationPipe`를 전역 파이프로 적용
- **로깅**: winston (`nest-winston`) + 전역 `RequestLoggingInterceptor`
- 전역 가드 `GqlAuthGuard` 적용 — `@Public()` 데코레이터가 붙은 리졸버만 인증 면제
- 환경변수: `apps/api/.dev.env` (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`)

### apps/mobile (`eatme-mobile`)

- **Expo SDK 58**, Expo Router, Apollo Client, NativeWind(웹과 같은 이름·값의 색상 토큰), `expo-secure-store`, `expo-notifications`, `expo-apple-authentication`, `expo-web-browser`, `@sentry/react-native`
- scheme `eatme`, 기본 번들 ID `com.eatme.app`(`APP_BUNDLE_ID`로 덮어쓰기). 실행·EAS·준비물은 `apps/mobile/README.md`.
- GraphQL 타입은 루트 `pnpm generate`로 `apps/mobile/gql/`에도 생성.

## 데이터 모델 (Prisma)

`apps/api/prisma/schema.prisma` 기준 핵심 엔티티:

- **User** — (추가: `termsAgreedAt`/`termsVersion`, `pushEnabled`/`pushHour`/`lastExpiryPushAt`, `appleRefreshToken`) 이메일/비밀번호 + `provider`(local|google), `preferenceTags`, `reviews`/`sessions`/`ingredients`/`recipes` 관계
- **Session** — refresh token 저장 (rotation/만료 관리)
- **Ingredient** — 사용자별 냉장고 식재료. `category`, `storage`(FRIDGE/FREEZER/PANTRY), `status`(FRESH/EXPIRING_SOON/EXPIRED/USED/DISCARDED), `unit`, `expireAt`
- **Recipe** — 레시피 본문(`steps`, `servings`, `cookTime`, `difficulty`)
- **IngredientItem** — 표준 재료 카탈로그(이름 unique). 여러 레시피가 참조
- **RecipeIngredient** — 레시피↔표준재료 junction (사용량/단위/optional)

## API 모듈 (`apps/api/src/modules`)

`user`, `auth`(`common/auth`), `ingredient`, `recipe`(+ `recipe-ingredient`), `review`, `notification`(푸시), `youtube`, appConfig. 각 모듈은 `*.resolver.ts` / `*.service.ts` / `dtos` / `models` 구성.

## 인증 흐름

1. `login` mutation → `AuthService.localLogin`: bcrypt 검증 후 access token(15분) + refresh token(일반 7일 / autologin 30일) 발급, `Session`(기기 단위, `platform`: web|ios|android) 생성. 토큰에는 `typ` 클레임(`access` / `refresh` / OAuth state용 별도 타입)이 있어 서로 혼용되지 않는다. access token은 `sid`(Session id)를 담고 `JwtStrategy.validate`가 세션 존재를 확인하므로 로그아웃·계정 삭제 시 즉시 무효화된다(요청당 DB 조회 1회).
2. **refresh rotation**: `refreshToken(refreshToken)` mutation(`@Public`)이 유효한 세션이면 새 access/refresh를 발급하고 같은 Session 행을 새 refresh로 교체한다(platform 유지, mutation에 platform 인자 없음). 무효/만료는 `UNAUTHENTICATED`.
3. `logout(refreshToken)`은 해당 기기 세션만 삭제(그 세션의 PushToken도 cascade 삭제). 전체 삭제는 `deleteAccount`(즉시 삭제, Apple 연동 계정은 revoke 시도)뿐.
4. 웹은 토큰을 `bt-token` 쿠키(httpOnly, JSON `{accessToken, refreshToken, expiresAt}`)에 저장 — `apps/web/src/lib/definitions.ts`의 `TOKEN_COOKIE`. Apollo SSR 클라이언트(`apps/web/src/app/ApolloClient.ts`)가 쿠키에서 accessToken을 읽어 `Authorization: Bearer` 헤더로 주입.
5. `apps/web/src/proxy.ts`(Next.js 16 Proxy)가 `/dashboard`, `/fridge`, `/recipes`, `/insights` 등 보호 경로에서 쿠키 부재 시 `/login`, `expiresAt`이 지났거나 60초 이내면 `refreshToken`으로 갱신해 쿠키를 다시 심고, refresh token이 무효(`UNAUTHENTICATED`)면 쿠키 삭제 후 `/login`(일시적 실패는 통과, 아래 9 참고).
6. **모바일**: 토큰은 `expo-secure-store`. Apollo 갱신 링크가 `UNAUTHENTICATED`를 받으면 single-flight로 refresh 후 원 요청을 재시도하고, 실패하면 토큰 삭제 → 로그인 화면. 라우팅 가드: 토큰 없음 → 로그인, 약관 미동의 → consent, 온보딩 미완 → onboarding.
7. **Sign in with Apple(iOS)**: `appleLogin` mutation(`@Public`)이 Apple JWKS로 `identityToken`(iss/aud=`APPLE_BUNDLE_ID`/만료)을 검증하고 `resolveOAuthLogin`을 재사용한다. 같은 이메일 충돌이면 `linkTicket`을 돌려줘 연동 화면으로 이동. `authorizationCode`를 Apple에 교환해 refresh token을 `User.appleRefreshToken`에 저장(계정 삭제 시 revoke). `APPLE_*` 키 미설정이면 교환은 건너뛰고 경고 로그.
8. **약관**: `TERMS_VERSION = '2026-11'`. 이메일 가입은 `agreeTerms: true`가 필수(`createUserSchema`)이고 가입 시 저장, 소셜 가입자는 로그인 직후 consent 화면에서 `agreeTerms` mutation으로 동의.
9. **rate-limit**: `@nestjs/throttler` 기반 가드로 login/signup/appleLogin/linkSocialAccount를 IP당 제한(`AUTH_THROTTLE_LIMIT`, `AUTH_THROTTLE_TTL_MS`). **refreshToken은 제한하지 않는다** — 웹은 Next 서버(단일 IP)가 모든 사용자의 갱신을 대신 호출하므로 IP 한도에 걸리면 대량 로그아웃이 난다. 클라이언트 IP는 `req.ip` 우선.
   - **Rate-limit 설정(운영)**: 웹 서버(Apollo SSR 클라이언트 `ApolloClient.ts`, proxy의 토큰 갱신)는 들어온 요청의 `x-forwarded-for`(없으면 `x-real-ip`)를 API 호출에 `x-forwarded-for`로 전달한다(`apps/web/src/lib/forwarded-for.ts`). 운영에서는 API `TRUST_PROXY`가 **Next 서버와 그 앞 ingress/로드밸런서 홉을 신뢰**하도록 설정해야(예: 홉 수 `2` 또는 내부 CIDR 목록) Fastify `req.ip`가 브라우저 IP로 풀린다. 미설정이면 웹 경유 login/signup이 Next 서버 IP 하나로 묶여 함께 제한된다.
   - 웹 proxy는 갱신 결과가 `unauthenticated`(refresh token 무효)일 때만 쿠키 삭제 후 `/login`, 일시적 실패(`TOO_MANY_REQUESTS`·5xx·네트워크 등 `transient`)면 기존 쿠키로 통과시키고 다음 요청에서 재시도한다.

### 소셜 로그인 (네이버 / Google OAuth)

리다이렉트 기반 OAuth라 인증은 api(4000)에서 끝나지만 `bt-token` 쿠키는 웹(3000) 오리진에 심어야 한다. 토큰을 URL에 노출하지 않기 위해 **일회용 code 교환 방식**을 사용한다.

1. 웹 로그인 폼의 "네이버로 시작하기" / "Google로 시작하기" 버튼 → 브라우저가 api `GET /auth/{provider}` 로 이동 (`LoginForm.tsx`, `NEXT_PUBLIC_API_BASE_URL` 기본 `http://localhost:4000`).
2. `AuthController`가 `buildAuthorizeUrl`로 제공자 authorize URL을 만들어 Nest `@Redirect()`로 리다이렉트. **주의 1**: passport의 authorize 리다이렉트는 `res.setHeader`/`res.end`(Express 스타일)에 의존하는데 FastifyReply엔 없어서 동작 안 함 → 진입 단계는 passport 가드를 쓰지 않고 수동 리다이렉트한다. **주의 2**: `@Res()`(library-specific 모드)는 전역 인터셉터와 함께 쓰면 Fastify에서 응답이 플러시되지 않아 리다이렉트가 안 나감 → 컨트롤러 리다이렉트는 모두 `@Redirect()` + `{ url, statusCode }` 반환 방식 사용. 크리덴셜은 `ConfigService`로 읽음.
3. 제공자가 api `GET /auth/{provider}/callback`(`AuthController`, `@Public()` + passport 가드)으로 콜백. 콜백은 passport 전략(`common/auth/strategies/*.strategy.ts`, `passport-naver-v2` / `passport-google-oauth20`)이 토큰 교환·프로필 검증(res 메서드 불필요라 Fastify에서 정상 동작) → `AuthService.oauthLogin`이 이메일로 user upsert 후 access/refresh 토큰 + `Session` 발급(로컬 로그인과 동일 계약).
4. api는 토큰을 `OAuthCodeStore`(in-memory, TTL 60초, 단일 인스턴스 전용)에 넣고 **일회용 code**만 발급 → 웹 `GET /auth/{provider}/callback?code=...`(`apps/web/src/app/auth/[provider]/callback/route.ts`)로 리다이렉트.
5. 웹 라우트 핸들러가 `exchangeOAuthCode(code)` mutation(`@Public()`)으로 code를 토큰으로 교환 → `bt-token` 쿠키 설정 → `/dashboard` 리다이렉트. 로컬 로그인과 동일하게 **쿠키는 웹에서** 심는다.

#### 소셜 계정 연동 (같은 이메일 충돌 시)

`AuthService.resolveOAuthLogin`이 예외 대신 판별 결과(`authenticated` | `link_required`)를 반환한다. 같은 이메일이 다른 방식으로 이미 가입돼 있으면:

- **기존 계정에 local 비밀번호가 있음** → 연동 티켓(`SocialLinkStore`, TTL 10분, 연동 후 발급할 세션 platform도 보관) 발급 → 웹 `/link?ticket=...&provider=...`로 리다이렉트 → 사용자가 **기존 비밀번호 입력**(`linkSocialAccount(ticket, password)` mutation) → 비밀번호로 소유권 확인 후 `User.providers`에 provider 추가 + 세션 발급 → `/dashboard`.
- **순수 소셜 계정(비밀번호 없음)** → 비밀번호 확인 불가 → `/login?error=account_exists` 안내.
- 로그인 가능한 인증수단은 `User.provider`(원 가입 방식) + `User.providers String[]`(연동된 방식)로 판별한다.

#### OAuth 보안 (state nonce / PKCE)

- authorize 요청의 `state`는 서명된 JWT(5분, `typ`은 OAuth state 전용)이며 그 안의 nonce를 **API 오리진 httpOnly 쿠키**에도 심는다. 콜백 가드(`createOAuthCallbackGuard`)가 passport보다 먼저 state 서명 + nonce 쿠키 일치를 검증하고, 제공자 취소(`?error=`)는 passport 전에 에러 리다이렉트로 처리한다.
- **모바일**: `GET /auth/google?client=mobile&code_challenge=…&platform=ios|android`(PKCE S256, 43자 base64url 필수 — 없으면 `eatme://auth/callback?error=…`. `platform`은 선택이며 state JWT에 실려 세션 platform이 된다. 웹 콜백 세션은 `web`). 콜백은 `${MOBILE_REDIRECT_URI ?? 'eatme://'}auth/callback?code=…`(연동 필요 시 `…link?ticket=…&provider=…`)로 보내고, 앱이 `exchangeOAuthCode(code, codeVerifier)`로 교환한다. 네이버는 v1 앱 UI에 노출하지 않는다.

#### 마이그레이션 / 배포

- 모바일 v1 마이그레이션: `apps/api/prisma/migrations/20261103000000_mobile_v1`(Session.platform, PushToken, User 약관/푸시/Apple 필드 등. `providers` 컬럼은 `ADD COLUMN IF NOT EXISTS`로 안전하게 추가). 운영 반영은 `pnpm --filter eatme-back exec prisma migrate deploy`. 로컬 개발 DB는 `prisma migrate dev`.

#### 푸시 알림 (유통기한)

- 앱이 `registerPushToken(token, platform)`로 현재 Session에 Expo 푸시 토큰을 연결(같은 token은 소유 세션 갱신). `updateNotificationSettings(pushEnabled, pushHour)`로 on/off·시각(KST 0~23, 기본 9) 설정, `profile`에 노출.
- `ExpiryNotificationScheduler`가 매시 정각(Asia/Seoul) cron으로 `pushEnabled && pushHour == 현재 KST 시`인 사용자에게 오늘~D+1 만료 재료 하루 1건 요약 푸시를 보낸다(`lastExpiryPushAt`으로 하루 1회). `ExpoPushClient`가 100건 배치로 Expo 푸시 API 호출, `DeviceNotRegistered`면 토큰 삭제.
- **단일 인스턴스 전제**: cron이 모든 인스턴스에서 돌아 다중 인스턴스 배포 시 중복 발송 가능(락/분산 스케줄러 필요).

#### 환경변수

api (`apps/api/.dev.env`; 비밀값 미설정이어도 부팅되고 해당 기능만 비활성 + 경고 로그):

- 필수: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- URL: `WEB_BASE_URL`, `API_BASE_URL`(콜백·리다이렉트 대상), `MOBILE_REDIRECT_URI`(기본 `eatme://`)
- 소셜: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`(리디렉션 URI `http://localhost:4000/auth/google/callback`), `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`(Callback `http://localhost:4000/auth/naver/callback`)
- Apple: `APPLE_BUNDLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`(.p8 내용)
- 보안/운영: `TRUST_PROXY`(true/false/홉 수/CIDR 목록), `AUTH_THROTTLE_LIMIT`, `AUTH_THROTTLE_TTL_MS`
- 푸시: `EXPO_ACCESS_TOKEN`
- appConfig: `APP_MIN_VERSION`, `APP_LATEST_VERSION`, `IOS_STORE_URL`, `ANDROID_STORE_URL`, `SUPPORT_EMAIL`
- 기타: `YOUTUBE_API_KEY`

web: `NEXT_PUBLIC_API_BASE_URL`(기본 `http://localhost:4000`).
mobile: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WEB_BASE_URL`(정책 페이지 링크), `EXPO_PUBLIC_SENTRY_DSN`(없으면 Sentry 생략), `APP_BUNDLE_ID`(app.config), `SENTRY_ORG`/`SENTRY_PROJECT`(소스맵 업로드).

**알려진 한계 / TODO**:

- 네이버는 이메일이 선택 동의라 없을 수 있음 → 현재 `naver_{id}@oauth.local` placeholder 이메일로 대체(계정 식별 정책 재검토 필요).
- 소셜 계정 연동은 **로그인 중 충돌 시 비밀번호 확인(JIT)** 방식만 지원. 순수 소셜 계정끼리 충돌은 연동 불가로 안내만 함. 설정 페이지 연동·unlink는 미구현(`SocialLinkStore` 티켓은 provider 이름만 보관).
- **웹 오리진 OAuth 홉은 미바인딩**: state nonce 쿠키는 API 오리진 쿠키라 모바일/웹 모두 API에서 검증하지만, API → 웹 `/auth/{provider}/callback?code=` 리다이렉트 구간은 브라우저에 바인딩되지 않음(code는 일회용·TTL 60초로 완화).
- `OAuthCodeStore` / `SocialLinkStore`는 프로세스 메모리 기반 → 다중 인스턴스 시 Redis 등 공유 저장소 필요. 푸시 cron도 다중 인스턴스에서 중복 발송 가능.
- 비밀번호 재설정, 모바일 네이버 로그인, 푸시 receipt 조회, API Sentry는 v1.1 이후.

## 웹 라우트 (App Router 그룹)

- `(site)` — 랜딩
- `(auth)` — `/login`, `/signup`
- `(app)` — 인증 영역: `/dashboard`, `/fridge`(목록/`add`/`[id]/edit`), `/recipes`(목록/`[id]`), `/insights`
- `(site)` — 정책 페이지 `/privacy`, `/terms`(법률 검토 필요 초안)

## 개발 명령어

```bash
# 의존성 설치 (루트)
pnpm install

# 백엔드 (apps/api, 포트 4000)
pnpm --filter eatme-back start:dev
pnpm --filter eatme-back seed          # prisma/seed.ts

# 프론트엔드 (apps/web, 포트 3000)
pnpm --filter eatme-front dev

# 모바일 (apps/mobile) — 로컬 실행은 apps/mobile/README.md
pnpm --filter eatme-mobile start

# 공유 도메인 패키지 빌드 (core 수정 후)
pnpm --filter @eatme/core build

# 전체 검증 (schemas·core build → core/api/web/mobile 타입체크·테스트)
pnpm verify

# GraphQL 코드젠 (api가 4000에서 떠 있어야 함 → apps/web/gql/, apps/mobile/gql/ 생성)
pnpm generate

# 공유 스키마 빌드
pnpm --filter @eatme/schemas build
```

## 관련 문서

- `apps/api/CLAUDE.md` — **백엔드 NestJS 컨벤션**. 데코레이터(annotation) 우선 원칙 등. api 작업 시 필독.
- `apps/web/AGENTS.md` — **냉부 디자인 시스템**("The Digital Larder") 색상 토큰·컴포넌트 규칙. 웹 UI 작업 시 필독.
- `apps/web/docs/DESIGN.md` — 디자인 상세 스펙
- `apps/api/docs/recipe-from-gov.md` — 공공데이터 레시피 연동 메모

## 구현 예정 / 아이디어

- [ ] 쿠팡 로그인 및 주문 내역 연동 (구매 식재료 자동 등록)
