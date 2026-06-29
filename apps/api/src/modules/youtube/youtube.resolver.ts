import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '@common/decorators/setMetadata';
import { CookingShort } from './models/cooking-short.model';
import { YoutubeService } from './youtube.service';

@Resolver(() => CookingShort)
export class YoutubeResolver {
  constructor(private readonly youtubeService: YoutubeService) {}

  // 유저별 데이터가 아니므로 인증 면제 — 캐시된 공통 결과를 반환한다.
  @Public()
  @Query(() => [CookingShort], { name: 'cookingShorts' })
  async cookingShorts(): Promise<CookingShort[]> {
    return this.youtubeService.getCookingShorts();
  }
}
