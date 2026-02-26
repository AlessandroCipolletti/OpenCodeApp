import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, BadRequestException,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async findAll(@Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.itemsService.findAll(ctx.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.itemsService.findOne(id, ctx.tenantId);
  }

  @Post()
  async create(
    @Query('tenant') tenantSlug: string,
    @Body() body: { title: string; description: string },
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.itemsService.create(ctx.tenantId, body.title, body.description);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Query('tenant') tenantSlug: string,
    @Body() body: { title?: string; description?: string },
  ) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    return this.itemsService.update(id, ctx.tenantId, body.title, body.description);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('tenant') tenantSlug: string) {
    if (!tenantSlug) throw new BadRequestException('tenant query param required');
    const ctx = await this.tenantService.resolve(tenantSlug);
    await this.itemsService.remove(id, ctx.tenantId);
    return { success: true };
  }
}
