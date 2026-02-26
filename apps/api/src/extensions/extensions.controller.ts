import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ExtensionsService } from "./extensions.service";

@ApiTags("extensions")
@Controller("extensions")
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Get()
  @ApiOperation({ summary: "List extensions for a tenant" })
  @ApiQuery({ name: "tenant", required: true })
  list(@Query("tenant") tenant?: string) {
    if (!tenant) throw new BadRequestException('Query param "tenant" is required');
    return this.extensionsService.listExtensions(tenant);
  }
}
