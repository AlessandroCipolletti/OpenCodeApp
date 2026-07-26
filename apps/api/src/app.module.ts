import { Module } from '@nestjs/common';
import { SettingsModule } from './settings/settings.module';
import { VoiceModule } from './voice/voice.module';
import { AgentModule } from './agent/agent.module';
import { ItemsModule } from './items/items.module';
import { ReleasesModule } from './releases/releases.module';
import { TenantModule } from './tenant/tenant.module';
import { HealthModule } from './health/health.module';
import { ExtensionsModule } from './extensions/extensions.module';

@Module({
  imports: [
    TenantModule,
    SettingsModule,
    VoiceModule,
    AgentModule,
    ItemsModule,
    ReleasesModule,
    HealthModule,
    ExtensionsModule,
  ],
})
export class AppModule {}
