import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
  provider: z.string().optional(),
  preferenceTags: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  preferenceTags: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
