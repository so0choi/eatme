import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { CookingShort } from './models/cooking-short.model';

// 고정 검색 키워드 — 호출마다 라운드로빈으로 1개만 사용해 쿼터(검색 1회=100units)를 아낀다.
const SEARCH_KEYWORDS = ['요리 쇼츠', '간단 레시피', '자취 요리', '집밥 레시피'];

// YouTube Data API: search.list 1회 = 100 units. 6시간 캐시 → 하루 최대 ~400 units(한도 10,000의 4%).
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
  };
}

@Injectable()
export class YoutubeService implements OnModuleInit {
  private readonly logger = new Logger(YoutubeService.name);

  private cache: CookingShort[] = [];
  private fetchedAt = 0;
  private keywordIndex = 0;

  constructor(private readonly configService: ConfigService) {}

  // 부팅 직후 1회 워밍 — 첫 사용자 요청이 캐시 hit이 되도록 미리 채운다.
  async onModuleInit() {
    await this.refresh();
  }

  // 6시간마다 사전 갱신 → 사용자 요청은 항상 캐시 hit.
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleScheduledRefresh() {
    await this.refresh();
  }

  // 캐시가 유효하면 그대로, 만료됐으면 1회 재호출 후 반환.
  async getCookingShorts(): Promise<CookingShort[]> {
    if (Date.now() - this.fetchedAt < CACHE_TTL_MS && this.cache.length > 0) {
      return this.cache;
    }
    await this.refresh();
    return this.cache;
  }

  // 고정 키워드 1개로 YouTube를 검색해 캐시를 갱신한다. 키 없음/에러 시 기존 캐시 유지(빈배열로 폴백).
  private async refresh(): Promise<void> {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      this.logger.warn('YOUTUBE_API_KEY가 설정되지 않아 요리 쇼츠를 건너뜁니다.');
      return;
    }

    const keyword = SEARCH_KEYWORDS[this.keywordIndex % SEARCH_KEYWORDS.length];
    this.keywordIndex += 1;

    try {
      const { data } = await axios.get<{ items?: YoutubeSearchItem[] }>(SEARCH_ENDPOINT, {
        params: {
          key: apiKey,
          part: 'snippet',
          q: keyword,
          type: 'video',
          videoDuration: 'short',
          videoEmbeddable: 'true',
          maxResults: 15,
          order: 'relevance',
          regionCode: 'KR',
          relevanceLanguage: 'ko',
        },
      });

      const items = data.items ?? [];
      this.cache = items
        .map((item) => this.toCookingShort(item))
        .filter((s): s is CookingShort => s !== null);
      this.fetchedAt = Date.now();
      this.logger.log(`요리 쇼츠 ${this.cache.length}건 갱신 (keyword="${keyword}")`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? `${error.response?.status} ${JSON.stringify(error.response?.data)}`
        : String(error);
      this.logger.error(`요리 쇼츠 갱신 실패 (keyword="${keyword}"): ${message}`);
    }
  }

  private toCookingShort(item: YoutubeSearchItem): CookingShort | null {
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (!videoId || !snippet) return null;

    const thumbnailUrl =
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.medium?.url ??
      snippet.thumbnails?.default?.url;
    if (!thumbnailUrl) return null;

    return {
      videoId,
      title: snippet.title ?? '',
      channelTitle: snippet.channelTitle ?? '',
      thumbnailUrl,
      publishedAt: snippet.publishedAt,
    };
  }
}
