import {
  Controller, Get, Query, BadRequestException, Header, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExtensionsService } from './extensions.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('extensions')
export class ExtensionsController {
  constructor(
    private readonly extensionsService: ExtensionsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('routes')
  async listRoutes(@Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    await this.tenantService.resolve(tenantSlug);
    return this.extensionsService.listRoutes(tenantSlug);
  }

  @Get('bundle')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async bundle(
    @Query('tenant') tenantSlug: string,
    @Query('extension') extensionId: string = 'ui',
    @Res() res: Response,
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    await this.tenantService.resolve(tenantSlug);
    const js = await this.extensionsService.getHostBundle(tenantSlug, extensionId);
    res.send(js);
  }
}
