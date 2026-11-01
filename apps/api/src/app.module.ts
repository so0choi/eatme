import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { UsersModule } from './modules/user/users.module';
import { AuthModule } from '@common/auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { GqlAuthGuard } from '@common/auth/guards/gql.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '@modules/app-config/app-config.module';
import { RequestLoggingInterceptor } from '@common/interceptors/request-logging.interceptor';
import { PrismaModule } from './database/prisma.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

import { WinstonModule } from '@common/logger/winston.module';
import { ReviewModule } from '@modules/review/review.module';
import { IngredientModule } from '@modules/ingredient/ingredient.module';
import { RecipeModule } from '@modules/recipe/recipe.module';
import { YoutubeModule } from '@modules/youtube/youtube.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: '.dev.env',
    }),
    // 인증 mutation 전용 rate-limit(GqlThrottlerGuard를 건 곳에서만 적용). 한도는 env로 조정 가능.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('AUTH_THROTTLE_TTL_MS') ?? 60_000),
            limit: Number(config.get('AUTH_THROTTLE_LIMIT') ?? 10),
          },
        ],
        setHeaders: false,
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req, connection }) => {
        if (req) {
          const user = req.headers.authorization;
          return { ...req, user };
        } else {
          return connection;
        }
      },
    }),
    UsersModule,
    AuthModule,
    WinstonModule,
    ReviewModule,
    IngredientModule,
    RecipeModule,
    YoutubeModule,
    AppConfigModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
