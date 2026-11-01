import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export const EXPO_PUSH_CLIENT = Symbol('EXPO_PUSH_CLIENT');

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: object;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export interface ExpoPushClient {
  send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

@Injectable()
export class ExpoPushHttpClient implements ExpoPushClient {
  private readonly logger = new Logger(ExpoPushHttpClient.name);

  constructor(private readonly configService: ConfigService) {}

  /** 100건 단위로 나눠 POST하고, 입력 순서와 같은 순서의 ticket을 돌려준다. */
  async send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const tickets: ExpoPushTicket[] = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const res = await axios.post<{ data: ExpoPushTicket[] }>(EXPO_PUSH_URL, batch, {
          headers,
        });
        tickets.push(...res.data.data);
      } catch (error) {
        this.logger.error(`Expo push batch failed: ${(error as Error).message}`);
        tickets.push(...batch.map((): ExpoPushTicket => ({ status: 'error' })));
      }
    }
    return tickets;
  }
}
