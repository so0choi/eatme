import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@db/prisma.service';
import { UserModel } from '@prisma/models';
import { CreateUserInput } from './dtos/create.dto';
import { UpdateDto } from './dtos/update.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name, {
    timestamp: true,
  });

  constructor(private readonly prismaService: PrismaService) {}

  async create(createDto: CreateUserInput): Promise<UserModel> {
    const { email, provider } = createDto;

    const exists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('EMAIL_IN_USE');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    return this.prismaService.user.create({
      data: {
        ...createDto,
        password: hashedPassword,
        provider: provider ?? 'local',
      },
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
