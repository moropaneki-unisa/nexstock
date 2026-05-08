import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      ok: true,
      service: 'inventoryhub-api',
      message: 'Everything runs well',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
