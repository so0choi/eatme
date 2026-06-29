import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YoutubeResolver } from './youtube.resolver';
import { YoutubeService } from './youtube.service';

@Module({
  imports: [ConfigModule],
  providers: [YoutubeService, YoutubeResolver],
})
export class YoutubeModule {}
