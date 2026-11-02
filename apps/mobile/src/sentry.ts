import * as Sentry from '@sentry/react-native';

/** DSN(EXPO_PUBLIC_SENTRY_DSN)이 있을 때만 Sentry를 초기화한다. 없으면 아무것도 하지 않는다. */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
  });
}
