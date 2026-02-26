import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TenantsService, CreateTenantDto } from "./tenants.service";

@ApiTags("tenants")
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: "List all tenants" })
  @ApiResponse({ status: 200, description: "List of tenants" })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a tenant by ID" })
  findOne(@Param("id") id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new tenant" })
  @ApiResponse({ status: 201, description: "Tenant created" })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a tenant" })
  remove(@Param("id") id: string) {
    return this.tenantsService.remove(id);
  }
}
