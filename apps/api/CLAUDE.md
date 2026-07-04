# apps/api 규칙 (NestJS)

> 프로젝트 전반 설명은 루트 `../../CLAUDE.md` 참고. 이 파일은 백엔드 구현 컨벤션만 다룬다.

## NestJS 데코레이터(annotation) 우선 원칙

가능하면 **NestJS가 제공하는 데코레이터/추상화를 사용**하고, 프레임워크를 우회하는 라이브러리별(library-specific) 직접 처리는 피한다. 데코레이터 방식은 전역 인터셉터·파이프·예외 필터·가드 파이프라인과 자연스럽게 맞물리지만, 우회 방식은 이 파이프라인을 건너뛰어 미묘한 버그를 만든다.

### 구체 규칙

- **리다이렉트**: `@Redirect()` + `{ url, statusCode }` 반환을 사용한다. `@Res()`로 받아 `reply.redirect()`를 직접 호출하지 말 것.
  - 이유: `@Res()`는 library-specific 응답 모드로 전환되어 응답 책임이 핸들러로 넘어간다. **전역 인터셉터(`RequestLoggingInterceptor`)와 함께 쓰면 Fastify에서 응답이 플러시되지 않아 리다이렉트가 나가지 않는 실제 버그가 있었다.** (`common/auth/auth.controller.ts` OAuth 진입/콜백 참고)
- **`@Res()` / `@Req()` 직접 사용 지양**: 정말 필요한 경우가 아니면 쓰지 않는다. 꼭 응답 객체가 필요하면 `@Res({ passthrough: true })`로 파이프라인을 유지한다.
- **인증/인가**: 가드 + `@Public()`(`common/decorators/setMetadata.ts`), 현재 유저는 `@CurrentUser()`(`common/decorators/getCurrentUser.ts`) 데코레이터로 접근한다. 컨텍스트에서 수동으로 파싱하지 말 것.
- **검증**: DTO + 전역 `ZodValidationPipe`(nestjs-zod)에 맡긴다. 리졸버/컨트롤러 본문에서 수동 검증하지 말 것.
- **환경변수**: `process.env` 직접 접근 대신 `ConfigService`(생성자 주입)로 읽는다. 특히 provider 클래스 생성자에서는 모듈 평가 시점 문제를 피하려면 `ConfigService`를 써야 한다.
- **응답/에러 형태**: GraphQL은 `HttpException` 계열을 던지면 전역 `ExceptionFilter`가 처리한다. 컨트롤러(REST)에서 직접 상태코드를 조립하기보다 예외를 던지거나 `@Redirect()`를 쓴다.
  - ⚠️ 현재 `filters/global-exception.filter.ts`는 GraphQL 전용이라 **REST 경로의 예외는 HTTP 응답을 못 보낸다**(멈춤). REST 라우트를 추가할 때는 이 한계를 인지하고, 필요 시 필터를 http 컨텍스트도 처리하도록 보강할 것.

### 예외 (직접 처리가 정당한 경우)

- passport OAuth authorize 리다이렉트처럼 프레임워크 추상화가 Fastify와 호환되지 않는 경우 → 대신 `@Redirect()`로 우회(위 참고). 그래도 `@Res()` 직접 조작은 최후의 수단.
