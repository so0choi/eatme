export const TOKEN_COOKIE = 'bt-token';

// API 베이스 URL(웹 서버/클라이언트 공용). GraphQL 엔드포인트는 `${API_BASE_URL}/graphql`.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
