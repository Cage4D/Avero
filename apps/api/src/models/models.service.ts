import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelDto, ModelStatusDto } from './dto/model.dto';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<ModelDto> {
    const model = await this.prisma.model.findUnique({ where: { code } });
    if (!model) throw new NotFoundException(`Model "${code}" not found`);
    return { ...model, status: model.status as ModelStatusDto };
  }
}
