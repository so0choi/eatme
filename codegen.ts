import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: [
    'apps/web/src/app/**/*.{ts,tsx}',
    'apps/web/src/components/**/*.{ts,tsx}',
  ],
  ignoreNoDocuments: true,
  generates: {
    './apps/web/gql/': {
      preset: 'client',
    },
  },
};

export default config;
