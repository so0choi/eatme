import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { AppleModule } from '@common/auth/apple/apple.module';
import { AccountDeletionService } from './account-deletion.service';
import { UsersService } from './users.service';

@Module({
  imports: [AppleModule],
  providers: [UsersService, UsersResolver, AccountDeletionService],
  exports: [UsersService],
})
export class UsersModule {}
