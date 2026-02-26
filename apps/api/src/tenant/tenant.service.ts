import { Injectable } from '@nestjs/common';
import { resolveTenantContext, TenantContext } from '@opencodeapp/core';

@Injectable()
export class TenantService {
  async resolve(slug: string): Promise<TenantContext> {
    return resolveTenantContext(slug);
  }
}
