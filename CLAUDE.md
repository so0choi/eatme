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
│  └─ api/      # 백엔드 (NestJS 11 + GraphQL)
├─ packages/
│  └─ schemas/  # @eatme/schemas — web/api 공유 zod 스키마
└─ codegen.ts   # GraphQL → TS 타입/훅 코드젠 설정
```

- 패키지 매니저: **pnpm** (workspace). 루트 `package.json`의 `workspaces`는 npm 호환용이며 실제 워크스페이스 정의는 `pnpm-workspace.yaml`.
- 공유 스키마 `packages/schemas`는 `@eatme/schemas`로 발행되며 `apps/api`에서 `workspace:*`로 의존. 빌드 산출물(`dist`)을 사용하므로 스키마 수정 후 `pnpm --filter @eatme/schemas build` 필요.

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

## 데이터 모델 (Prisma)

`apps/api/prisma/schema.prisma` 기준 핵심 엔티티:

- **User** — 이메일/비밀번호 + `provider`(local|google), `preferenceTags`, `reviews`/`sessions`/`ingredients`/`recipes` 관계
- **Session** — refresh token 저장 (rotation/만료 관리)
- **Ingredient** — 사용자별 냉장고 식재료. `category`, `storage`(FRIDGE/FREEZER/PANTRY), `status`(FRESH/EXPIRING_SOON/EXPIRED/USED/DISCARDED), `unit`, `expireAt`
- **Recipe** — 레시피 본문(`steps`, `servings`, `cookTime`, `difficulty`)
- **IngredientItem** — 표준 재료 카탈로그(이름 unique). 여러 레시피가 참조
- **RecipeIngredient** — 레시피↔표준재료 junction (사용량/단위/optional)

## API 모듈 (`apps/api/src/modules`)

`user`, `auth`(`common/auth`), `ingredient`, `recipe`(+ `recipe-ingredient`), `review`. 각 모듈은 `*.resolver.ts` / `*.service.ts` / `dtos` / `models` 구성.

## 인증 흐름

1. `login` mutation → `AuthService.localLogin`: bcrypt 검증 후 access token(15분) + refresh token(일반 7일 / autologin 30일) 발급, `Session` 레코드 생성.
2. 웹은 토큰을 `bt-token` 쿠키(httpOnly, JSON `{accessToken, refreshToken, expiresAt}`)에 저장 — `apps/web/src/lib/definitions.ts`의 `TOKEN_COOKIE`.
3. Apollo SSR 클라이언트(`apps/web/src/app/ApolloClient.ts`)가 쿠키에서 accessToken을 읽어 `Authorization: Bearer` 헤더로 주입.
4. `apps/web/src/proxy.ts`(Next.js 16 Proxy, 구 middleware)가 `/dashboard`, `/app` 경로에서 쿠키 부재 시 `/login` 리다이렉트.

### 소셜 로그인 (네이버 / Google OAuth)

리다이렉트 기반 OAuth라 인증은 api(4000)에서 끝나지만 `bt-token` 쿠키는 웹(3000) 오리진에 심어야 한다. 토큰을 URL에 노출하지 않기 위해 **일회용 code 교환 방식**을 사용한다.

1. 웹 로그인 폼의 "네이버로 시작하기" / "Google로 시작하기" 버튼 → 브라우저가 api `GET /auth/{provider}` 로 이동 (`LoginForm.tsx`, `NEXT_PUBLIC_API_BASE_URL` 기본 `http://localhost:4000`).
2. `AuthController`가 `buildAuthorizeUrl`로 제공자 authorize URL을 만들어 Nest `@Redirect()`로 리다이렉트. **주의 1**: passport의 authorize 리다이렉트는 `res.setHeader`/`res.end`(Express 스타일)에 의존하는데 FastifyReply엔 없어서 동작 안 함 → 진입 단계는 passport 가드를 쓰지 않고 수동 리다이렉트한다. **주의 2**: `@Res()`(library-specific 모드)는 전역 인터셉터와 함께 쓰면 Fastify에서 응답이 플러시되지 않아 리다이렉트가 안 나감 → 컨트롤러 리다이렉트는 모두 `@Redirect()` + `{ url, statusCode }` 반환 방식 사용. 크리덴셜은 `ConfigService`로 읽음.
3. 제공자가 api `GET /auth/{provider}/callback`(`AuthController`, `@Public()` + passport 가드)으로 콜백. 콜백은 passport 전략(`common/auth/strategies/*.strategy.ts`, `passport-naver-v2` / `passport-google-oauth20`)이 토큰 교환·프로필 검증(res 메서드 불필요라 Fastify에서 정상 동작) → `AuthService.oauthLogin`이 이메일로 user upsert 후 access/refresh 토큰 + `Session` 발급(로컬 로그인과 동일 계약).
4. api는 토큰을 `OAuthCodeStore`(in-memory, TTL 60초, 단일 인스턴스 전용)에 넣고 **일회용 code**만 발급 → 웹 `GET /auth/{provider}/callback?code=...`(`apps/web/src/app/auth/[provider]/callback/route.ts`)로 리다이렉트.
5. 웹 라우트 핸들러가 `exchangeOAuthCode(code)` mutation(`@Public()`)으로 code를 토큰으로 교환 → `bt-token` 쿠키 설정 → `/dashboard` 리다이렉트. 로컬 로그인과 동일하게 **쿠키는 웹에서** 심는다.

#### 소셜 계정 연동 (같은 이메일 충돌 시)

`AuthService.resolveOAuthLogin`이 예외 대신 판별 결과(`authenticated` | `link_required`)를 반환한다. 같은 이메일이 다른 방식으로 이미 가입돼 있으면:

- **기존 계정에 local 비밀번호가 있음** → 연동 티켓(`SocialLinkStore`, TTL 10분) 발급 → 웹 `/link?ticket=...&provider=...`로 리다이렉트 → 사용자가 **기존 비밀번호 입력**(`linkSocialAccount(ticket, password)` mutation) → 비밀번호로 소유권 확인 후 `User.providers`에 provider 추가 + 세션 발급 → `/dashboard`.
- **순수 소셜 계정(비밀번호 없음)** → 비밀번호 확인 불가 → `/login?error=account_exists` 안내.
- 로그인 가능한 인증수단은 `User.provider`(원 가입 방식) + `User.providers String[]`(연동된 방식)로 판별한다.

**⚠️ DB 마이그레이션 필요**: `User.providers String[]` 컬럼 추가됨 → `pnpm --filter eatme-back exec prisma migrate dev`(또는 `db push`) 실행 필요. (스키마/클라이언트는 반영됨, 실제 DB 컬럼은 마이그레이션 후 생성)

**설정 필요** (`apps/api/.dev.env`):

- `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` — 네이버 개발자센터에서 앱 등록, Callback URL `http://localhost:4000/auth/naver/callback` 등록
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console OAuth 2.0 클라이언트, 리디렉션 URI `http://localhost:4000/auth/google/callback`
- `API_BASE_URL` / `WEB_BASE_URL` — 배포 시 도메인에 맞게 변경(콜백 URL·리다이렉트 대상에 사용)

**알려진 한계 / TODO**:

- 네이버는 이메일이 선택 동의라 없을 수 있음 → 현재 `naver_{id}@oauth.local` placeholder 이메일로 대체(계정 식별 정책 재검토 필요).
- 소셜 계정 연동은 **로그인 중 충돌 시 비밀번호 확인(JIT)** 방식만 지원. 순수 소셜 계정끼리 충돌(비밀번호 없음)은 연동 불가로 안내만 함. 로그인 후 설정 페이지에서 연동하는 플로우는 미구현.
- `SocialLinkStore`의 연동 티켓은 providerId를 저장하지 않음(`providers` 배열은 provider 이름만 보관) → 특정 소셜 계정 식별/해제(unlink)는 후속 과제.
- `OAuthCodeStore` / `SocialLinkStore`는 프로세스 메모리 기반 → api 다중 인스턴스 배포 시 Redis 등 공유 저장소로 교체 필요.
- authorize 요청에 `state`를 보내지만 콜백에서 검증하지 않음 → OAuth CSRF 방어 미구현(후속 과제).

## 웹 라우트 (App Router 그룹)

- `(site)` — 랜딩
- `(auth)` — `/login`, `/signup`
- `(app)` — 인증 영역: `/dashboard`, `/fridge`(목록/`add`/`[id]/edit`), `/recipes`(목록/`[id]`)

## 개발 명령어

```bash
# 의존성 설치 (루트)
pnpm install

# 백엔드 (apps/api, 포트 4000)
pnpm --filter eatme-back start:dev
pnpm --filter eatme-back seed          # prisma/seed.ts

# 프론트엔드 (apps/web, 포트 3000)
pnpm --filter eatme-front dev

# GraphQL 코드젠 (api가 4000에서 떠 있어야 함 → apps/web/gql/ 생성)
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
