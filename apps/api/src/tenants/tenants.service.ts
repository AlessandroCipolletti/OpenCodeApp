import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@opencodeapp/db";

export interface CreateTenantDto {
  name: string;
  slug: string;
}

@Injectable()
export class TenantsService {
  async findAll() {
    return prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findOne(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    return prisma.tenant.create({ data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.tenant.delete({ where: { id } });
  }
}
