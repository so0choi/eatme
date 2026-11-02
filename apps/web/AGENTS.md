# Agent Rules

<!-- BEGIN:nextjs-agent-rules -->

## Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-rules -->

## 냉부 디자인 시스템

> 상세 스펙: `docs/DESIGN.md` — "The Digital Larder"
> 크리에이티브 컨셉: **고급 라이프스타일 매거진** 스타일의 에디토리얼 신선함

### 원칙

- **No-Line Rule**: 1px solid 보더로 영역 구분 금지. 대신 tonal layering(배경색 단계 변화)으로 깊이 표현
- **Ambient Shadow**: 일반 drop-shadow 금지. 전용 `shadow-ambient` 유틸리티 사용
- 다크 배경(`bg-slate-900`, `bg-slate-950` 등) 금지
- `bg-gradient-to-*` 금지 → `bg-linear-to-*` 사용 (Tailwind v4)

### 색상 토큰 (globals.css `@theme` 정의)

모든 색상은 커스텀 CSS 토큰으로 사용한다. 하드코딩된 `emerald-*`, `slate-*` 클래스 대신 아래 토큰을 사용할 것.

#### Primary (Freshness — 밝은 비비드 그린)

- `text-primary` / `bg-primary` → `#16a34a` (런타임 `:root --primary`; globals.css 기준)
- `bg-on-primary` / `text-on-primary` → `#ffffff` (primary 배경 위 텍스트·버튼)
- `bg-primary-container` → `#86efac` (연한 그린)
- `text-on-primary-container` / `bg-on-primary-container` → `#052e16`

#### Secondary (Organization — 블루)

- `bg-secondary-fixed` / `text-on-secondary-fixed` → `#d1e4ff` / `#001d36` (칩·태그용)
- `text-org` / `bg-org` → `#0061a4` (조직/분류 강조)

#### Tertiary (Expiration/Urgency — 레드-오렌지)

- `bg-tertiary-container` → `#ff6e43`
- `text-tertiary` → `#b02f00`

#### Surface Hierarchy (배경 깊이)

| 레이어 | 클래스 | 값 |
|--------|--------|----|
| 페이지 배경 | `bg-background` / `bg-surface` | `#f8faf9` |
| 섹션 구분 | `bg-surface-container-low` | `#f2f4f3` |
| 카드 내부 | `bg-surface-container` | `#eceeee` |
| 카드 (lifted) | `bg-surface-container-lowest` | `#ffffff` |

#### On-Surface (텍스트)

- 제목: `text-on-surface` → `#191c1c`
- 본문/보조: `text-on-surface-variant` → `#3f4948`
- 구분선(Ghost Border): `border-outline-variant/15` → `#bec9c8` 15% 투명도

### 타이포그래피

- 섹션 eyebrow: `text-xs font-semibold uppercase tracking-[0.05rem] text-primary`
- 페이지 제목 (h1): `font-display text-4xl font-bold text-on-surface`
- 섹션 제목 (h2): `font-display text-3xl font-bold text-on-surface`
- 카드 제목 (h3): `font-display text-lg font-semibold text-on-surface`
- 본문: `text-sm text-on-surface-variant`
- `font-display` = Nanum Gothic, `font-body` = Inter

### 컴포넌트 스타일

#### 카드 컨테이너 (Tonal Layering)

```text
/* 외부 래퍼 */
rounded-3xl bg-surface-container-low p-4 (또는 p-6)

/* 내부 카드 */
rounded-2xl bg-surface-container-lowest px-5 py-4 transition hover:shadow-ambient
```

#### 강조 패널 / CTA (Primary 그라데이션)

```text
rounded-3xl bg-linear-to-br from-primary to-primary-container p-8 shadow-ambient
```

#### 폼 패널 (로그인, 회원가입)

```text
rounded-3xl bg-surface-container-lowest p-8 shadow-ambient
```

#### 인풋

```text
rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface
placeholder:text-on-surface-variant/50
focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30
```

#### 버튼 — Primary

```text
bg-primary text-on-primary rounded-2xl px-4 py-3 font-semibold shadow-ambient
hover:opacity-90 hover:-translate-y-0.5
```

#### 버튼 — Ghost / Tertiary

```text
text-primary rounded-2xl px-4 py-3 font-semibold
hover:bg-surface-container
```

#### 버튼 — Hero CTA (그라데이션 배경 위)

- Primary: `rounded-full bg-on-primary px-8 py-3 text-primary font-semibold shadow-ambient`
- Secondary: `rounded-full border-2 border-on-primary/40 px-8 py-3 text-on-primary font-semibold hover:bg-on-primary/10`

### 네비게이션

```text
bg-surface-container-lowest/85 backdrop-blur-sm shadow-ambient sticky top-0 z-50
```

- 메뉴 텍스트: `text-on-surface-variant hover:text-primary`
- 모바일 호버: `hover:bg-surface-container hover:text-primary`

### 레이아웃

- 최대 너비: `max-w-6xl mx-auto`
- 기본 패딩: `px-4 sm:px-6 lg:px-8`
- 섹션 간격: `mt-20`
- 페이지 상단 여백: `pt-10 lg:pt-16`
- 카드 라운드: large = `rounded-3xl` (1.5rem), small = `rounded-2xl` (0.75rem)

### 그림자

- 카드 기본: 없음 (tonal layering으로 대체)
- 카드 호버: `hover:shadow-ambient`
- 강조 패널·네비: `shadow-ambient` (`0px 12px 32px rgba(25,28,28,0.06)`)

### 금지 패턴

- `border-slate-*`, `border-gray-*` 등으로 섹션 구분 금지 (No-Line Rule)
- `shadow-sm`, `shadow-md`, `drop-shadow` 금지 → `shadow-ambient` 사용
- `bg-slate-900`, `bg-slate-950` 등 어두운 배경 금지
- `bg-gradient-to-*` 금지 → `bg-linear-to-*` 사용 (Tailwind v4)
- `text-white` 단독 사용 금지 → `text-on-primary`, `text-on-surface` 등 토큰 사용
- 하드코딩된 `emerald-*`, `teal-*`, `slate-*` 색상 클래스 금지 → 토큰 사용

<!-- END:design-rules -->
