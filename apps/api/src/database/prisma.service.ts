import { PrismaClient } from '../../generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      accelerateUrl: process.env.DATABASE_URL,
      log: ['warn', 'error'],
    });
    return this.$extends(withAccelerate()) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }
}
