# Eat me (냉부) 프로젝트

냉장고 식재료를 관리하고, 보유 재료 기반으로 레시피를 추천받는 서비스.

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
- **인증**: Passport (local / JWT / Google OAuth20), `@nestjs/jwt`, bcrypt
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
4. `apps/web/src/middleware.ts`가 `/dashboard`, `/app` 경로에서 쿠키 부재 시 `/login` 리다이렉트.
5. Google OAuth는 `passport-google-oauth20` 전략 → `AuthService.oauthLogin`(없으면 user 자동 생성).

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

- `apps/web/AGENTS.md` — **냉부 디자인 시스템**("The Digital Larder") 색상 토큰·컴포넌트 규칙. 웹 UI 작업 시 필독.
- `apps/web/docs/DESIGN.md` — 디자인 상세 스펙
- `apps/api/docs/recipe-from-gov.md` — 공공데이터 레시피 연동 메모

## 구현 예정 / 아이디어

- [ ] 쿠팡 로그인 및 주문 내역 연동 (구매 식재료 자동 등록)
