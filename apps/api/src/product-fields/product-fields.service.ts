import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldType } from '@prisma/client';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductFieldDto, UpdateProductFieldDto } from './dto';

@Injectable()
export class ProductFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  list(organizationId: string) {
    return this.prisma.customField.findMany({
      where: { organizationId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(organizationId: string, dto: CreateProductFieldDto) {
    await this.planLimits.assertCanCreateCustomField(organizationId);
    const key = this.generateKeyFromLabel(dto.label);

    if (!key) {
      throw new BadRequestException('Field label must generate a valid key');
    }

    if (
      dto.type === CustomFieldType.select &&
      (!dto.options || dto.options.length === 0)
    ) {
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
        options: dto.options ?? [],
        defaultValue: dto.defaultValue as any,
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

    if (existing.isActive === false && dto.isActive === true) {
      await this.planLimits.assertCanCreateCustomField(organizationId);
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
    const nextOptions = dto.options ?? existing.options;

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
        options: dto.options,
        defaultValue: dto.defaultValue as any,
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
}
