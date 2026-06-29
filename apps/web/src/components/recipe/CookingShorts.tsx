'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { CookingShort } from 'gql/graphql';

// 공식 YouTube 로고 (브랜드 가이드라인 — 색상/비율 변형 없이 사용)
function YouTubeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-label="YouTube" role="img" className={className}>
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function ShortCard({ short }: { short: CookingShort }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="group w-56 shrink-0 overflow-hidden rounded bg-surface-container-lowest shadow-ambient transition hover:-translate-y-1">
      {/* 세로형(9:16) 쇼츠 비율 */}
      <div className="relative aspect-9/16 w-full bg-surface-container">
        {playing ? (
          // YouTube IFrame 임베드 플레이어 — API 약관상 임베드 플레이어로만 재생.
          <iframe
            src={`https://www.youtube.com/embed/${short.videoId}?autoplay=1&rel=0`}
            title={short.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`${short.title} 재생`}
            className="absolute inset-0"
          >
            <Image
              src={short.thumbnailUrl}
              alt={short.title}
              fill
              sizes="224px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            <span className="absolute inset-0 bg-linear-to-t from-on-surface/55 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-on-primary/90 text-primary shadow-ambient transition group-hover:scale-110">
              <Play className="h-5 w-5 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-on-surface">{short.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-on-surface-variant">{short.channelTitle}</p>
      </div>
    </article>
  );
}

export default function CookingShorts({ shorts }: { shorts: CookingShort[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (shorts.length === 0) return null;

  // 카드 폭(w-56=14rem) + gap(1rem) 기준으로 한 번에 약 2.5장씩 좌우 이동
  const scrollByCards = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {/* 공식 YouTube 로고로 출처 표기 (브랜드 가이드라인) */}
        <div className="flex items-center gap-2">
          <YouTubeLogo className="h-6 w-auto" />
          <h2 className="text-2xl font-bold uppercase tracking-[0.05rem] text-on-surface">
            유튜브 요리 영상
          </h2>
        </div>

        {/* 캐러셀 좌우 이동 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCards('prev')}
            aria-label="이전 영상"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-primary hover:text-on-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards('next')}
            aria-label="다음 영상"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-primary hover:text-on-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
      >
        {shorts.map((short) => (
          <div key={short.videoId} className="snap-start">
            <ShortCard short={short} />
          </div>
        ))}
      </div>
    </section>
  );
}
