import type { ExpoConfig } from 'expo/config';

const bundleId = process.env.APP_BUNDLE_ID ?? 'com.eatme.app';

const config: ExpoConfig = {
  name: 'Eat me',
  slug: 'eatme',
  scheme: 'eatme',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    usesAppleSignIn: true,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'expo-apple-authentication',
    'expo-web-browser',
    // Sentry 초기화는 Task 20. org/project 미설정이면 소스맵 업로드만 건너뛴다.
    [
      '@sentry/react-native',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
