import type { LLMProvider, LLMProviderConfig } from "./types";
import { OpenAIProvider } from "./openai-provider";

/**
 * Creates an LLMProvider from a config object.
 * Add new providers here as the switch cases grow.
 */
export function createProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider.toLowerCase()) {
    case "openai":
      return new OpenAIProvider(config.apiKey, config.model);
    default:
      throw new Error(
        `Unknown LLM provider: "${config.provider}". Supported: openai`
      );
  }
}

/**
 * Resolve the LLM config for a tenant.
 * If the tenant has a custom API key in DB, it takes precedence over the
 * global environment variable.
 */
export function resolveProviderConfig(
  tenantLlmSetting: { provider: string; apiKey: string; model: string } | null
): LLMProviderConfig {
  if (tenantLlmSetting && tenantLlmSetting.apiKey) {
    return {
      provider: tenantLlmSetting.provider,
      apiKey: tenantLlmSetting.apiKey,
      model: tenantLlmSetting.model,
    };
  }

  const globalKey = process.env["OPENAI_API_KEY"];
  if (!globalKey) {
    throw new Error(
      "No LLM API key configured. Set OPENAI_API_KEY or configure a tenant LLM setting."
    );
  }

  return {
    provider: "openai",
    apiKey: globalKey,
    model: "gpt-4o",
  };
}
