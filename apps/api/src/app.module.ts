import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PublicApiModule } from './public-api/public-api.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    ProductsModule,
    InventoryModule,
    ApiKeysModule,
    PublicApiModule,
    WebhooksModule,
  ],
})
export class AppModule {}
