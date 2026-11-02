import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@db/prisma.service';
import { UserModel } from '@prisma/models';
import { CreateUserInput } from './dtos/create.dto';
import { TERMS_VERSION } from '@common/constants/terms';
import { UpdateDto } from './dtos/update.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name, {
    timestamp: true,
  });

  constructor(private readonly prismaService: PrismaService) {}

  async create(createDto: CreateUserInput): Promise<UserModel> {
    // agreeTerms는 DB 컬럼이 아니므로 분리하고 동의 시각/버전으로 저장한다.
    const { agreeTerms: _agreeTerms, ...userData } = createDto;
    const { email, provider } = userData;

    const exists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('EMAIL_IN_USE');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    return this.prismaService.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        provider: provider ?? 'local',
        termsAgreedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
  }

  /** 소셜 가입자 등 아직 동의하지 않은 유저의 약관 동의를 기록한다. */
  agreeTerms(id: number): Promise<UserModel> {
    return this.prismaService.user.update({
      where: { id },
      data: { termsAgreedAt: new Date(), termsVersion: TERMS_VERSION },
    });
  }

  findOneById(id: number): Promise<UserModel> {
    return this.prismaService.user.findUnique({ where: { id } });
  }

  findOneByEmail(email: string): Promise<UserModel> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async edit({ id }: UserModel, updateData: UpdateDto): Promise<UserModel> {
    if (updateData.password) {
      updateData.password = await bcrypt.hash(
        updateData.password.toString(),
        10,
      );
    }
    const currentUser = await this.findOneById(id);

    return this.prismaService.user.update({
      where: { id: currentUser.id },
      data: {
        ...currentUser,
        ...updateData,
      },
    });
  }
}
