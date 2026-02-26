import type { HttpSdk, SdkContext } from "./types";

/**
 * Allowed external domains for extensions.
 * Extend this list as needed or make it configurable per tenant.
 */
const DEFAULT_ALLOWED_DOMAINS = ["api.openai.com", "api.github.com"];

export function createHttpSdk(
  context: SdkContext,
  allowedDomains: string[] = DEFAULT_ALLOWED_DOMAINS
): HttpSdk {
  return {
    async fetchAllowed(url: string, init?: RequestInit): Promise<Response> {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error(`Invalid URL: ${url}`);
      }

      if (!allowedDomains.includes(parsed.hostname)) {
        throw new Error(
          `HTTP fetch to "${parsed.hostname}" is not allowed. ` +
            `Allowed domains: ${allowedDomains.join(", ")}`
        );
      }

      return fetch(url, init);
    },
  };
}
