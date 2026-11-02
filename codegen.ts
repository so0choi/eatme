import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  ignoreNoDocuments: true,
  generates: {
    './apps/web/gql/': {
      preset: 'client',
      documents: [
        'apps/web/src/app/**/*.{ts,tsx}',
        'apps/web/src/components/**/*.{ts,tsx}',
      ],
    },
    './apps/mobile/gql/': {
      preset: 'client',
      documents: [
        'apps/mobile/src/**/*.{ts,tsx}',
        'apps/mobile/app/**/*.{ts,tsx}',
      ],
    },
  },
};

export default config;
