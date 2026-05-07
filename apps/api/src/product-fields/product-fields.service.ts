import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductFieldDto, UpdateProductFieldDto } from './dto';

@Injectable()
export class ProductFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.customField.findMany({
      where: { organizationId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(organizationId: string, dto: CreateProductFieldDto) {
    const key = this.generateKeyFromLabel(dto.label);

    if (!key) {
      throw new BadRequestException('Field label must generate a valid key');
    }

    const options = this.asStringArray(dto.options);

    if (dto.type === CustomFieldType.select && options.length === 0) {
      throw new BadRequestException('Select fields require at least one option');
    }

    const existing = await this.prisma.customField.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Field "${dto.label}" already exists`);
    }

    return this.prisma.customField.create({
      data: {
        organizationId,
        label: dto.label.trim(),
        key,
        type: dto.type,
        required: dto.required ?? false,
        options: options as Prisma.InputJsonValue,
        defaultValue: dto.defaultValue as Prisma.InputJsonValue,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProductFieldDto,
  ) {
    const existing = await this.prisma.customField.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product field not found');
    }

    const nextLabel = dto.label?.trim();
    const nextKey = nextLabel
      ? this.generateKeyFromLabel(nextLabel)
      : existing.key;

    if (!nextKey) {
      throw new BadRequestException('Field label must generate a valid key');
    }

    if (nextKey !== existing.key) {
      const duplicate = await this.prisma.customField.findUnique({
        where: {
          organizationId_key: {
            organizationId,
            key: nextKey,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException(`Field "${nextLabel}" already exists`);
      }
    }

    const nextType = dto.type ?? existing.type;
    const nextOptions = dto.options === undefined ? this.asStringArray(existing.options) : this.asStringArray(dto.options);

    if (nextType === CustomFieldType.select && nextOptions.length === 0) {
      throw new BadRequestException('Select fields require at least one option');
    }

    return this.prisma.customField.update({
      where: { id },
      data: {
        label: nextLabel,
        key: dto.label ? nextKey : undefined,
        type: dto.type,
        required: dto.required,
        options: dto.options === undefined ? undefined : (nextOptions as Prisma.InputJsonValue),
        defaultValue: dto.defaultValue === undefined ? undefined : (dto.defaultValue as Prisma.InputJsonValue),
        order: dto.order,
        isActive: dto.isActive,
      },
    });
  }

  async deactivate(organizationId: string, id: string) {
    const existing = await this.prisma.customField.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product field not found');
    }

    return this.prisma.customField.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private generateKeyFromLabel(label: string) {
    return label
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
