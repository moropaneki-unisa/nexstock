import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    dashboard(user: CurrentUserPayload): Promise<{
        totalProducts: number;
        lowStock: number;
        inventoryValue: number;
        apiKeyCount: number;
        webhookCount: number;
        recentActivity: {
            id: string;
            message: string;
            createdAt: Date;
        }[];
    }>;
}
