import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async dashboard(@CurrentUser() user: CurrentUserPayload) {
    const [products, recentLogs, apiKeyCount, webhookCount] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        select: { id: true, price: true, quantity: true, lowStockLevel: true },
      }),
      this.prisma.inventoryLog.findMany({
        where: { organizationId: user.organizationId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
      this.prisma.apiKey.count({ where: { organizationId: user.organizationId, revokedAt: null } }),
      this.prisma.webhook.count({ where: { organizationId: user.organizationId, isActive: true } }),
    ]);

    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.quantity <= p.lowStockLevel).length;
    const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

    return {
      totalProducts,
      lowStock,
      inventoryValue,
      apiKeyCount,
      webhookCount,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        message: `${log.type} ${log.delta} units for ${log.product.name}`,
        createdAt: log.createdAt,
      })),
    };
  }
}
