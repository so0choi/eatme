import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

const TICKET_TTL_MS = 10 * 60 * 1000; // 사용자가 비밀번호를 입력할 시간 10분

export type PendingLink = {
  email: string;
  provider: string;
};

type StoredEntry = {
  link: PendingLink;
  expiresAt: number;
};

/**
 * 소셜 로그인 충돌 시, "이 이메일 계정에 이 provider를 연동하려는 대기 상태"를 잠시 보관한다.
 * 웹이 티켓 + 기존 비밀번호로 연동을 확정할 때까지의 일회용 참조.
 *
 * NOTE: 프로세스 메모리 기반 — 다중 인스턴스 배포 시 Redis 등으로 교체 필요.
 */
@Injectable()
export class SocialLinkStore {
  private readonly store = new Map<string, StoredEntry>();

  issue(link: PendingLink): string {
    this.sweep();
    const ticket = randomBytes(24).toString('hex');
    this.store.set(ticket, { link, expiresAt: Date.now() + TICKET_TTL_MS });
    return ticket;
  }

  /** 티켓을 대기 정보로 교환한다. 성공 시 즉시 폐기(일회용). 없거나 만료면 null. */
  consume(ticket: string): PendingLink | null {
    const entry = this.store.get(ticket);
    if (!entry) return null;
    this.store.delete(ticket);
    if (entry.expiresAt < Date.now()) return null;
    return entry.link;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [ticket, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(ticket);
    }
  }
}
