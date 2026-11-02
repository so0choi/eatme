import { Injectable } from '@nestjs/common';
import { CreateReviewInput } from './dtos/create-review.dto';
import { PrismaService } from '@db/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prismaService: PrismaService) {}

  create = async ({ authorId, content, title }: CreateReviewInput) => {
    // TODO: title 공백 에러 처리
    return await this.prismaService.review.create({
      data: {
        title,
        authorId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            pushEnabled: true,
            pushHour: true,
          },
        },
      },
    });
  };
}
