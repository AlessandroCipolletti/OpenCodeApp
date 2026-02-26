import { Module } from "@nestjs/common";
import { TenantsModule } from "./tenants/tenants.module";
import { ItemsModule } from "./items/items.module";
import { ExtensionsModule } from "./extensions/extensions.module";
import { AgentModule } from "./agent/agent.module";

@Module({
  imports: [TenantsModule, ItemsModule, ExtensionsModule, AgentModule],
})
export class AppModule {}
