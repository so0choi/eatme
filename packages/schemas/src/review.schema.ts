import { z } from 'zod';

export const createReviewSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  content: z.string().min(1, '내용을 입력해주세요'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
