import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrganizationModule } from './organization/organization.module';
import { ApiKeyPlanLimitMiddleware } from './plan-limits/api-key-plan-limit.middleware';
import { PlanLimitsModule } from './plan-limits/plan-limits.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PublicApiModule } from './public-api/public-api.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    PrismaModule,
    PlanLimitsModule,
    AuthModule,
    BillingModule,
    HealthModule,
    DashboardModule,
    ProductsModule,
    InventoryModule,
    ApiKeysModule,
    PublicApiModule,
    WebhooksModule,
    IntegrationsModule,
    OrganizationModule,
    UsersModule,
  ],
  providers: [ApiKeyPlanLimitMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(ApiKeyPlanLimitMiddleware).forRoutes({ path: 'api-keys', method: RequestMethod.POST });
  }
}
