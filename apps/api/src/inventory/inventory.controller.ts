import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class InventoryLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  async logs(@CurrentUser() user: CurrentUserPayload, @Query() query: InventoryLogQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);
    const where = { organizationId: user.organizationId };

    const [items, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { product: true, variant: true },
      }),
      this.prisma.inventoryLog.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}
