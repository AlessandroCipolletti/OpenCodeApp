import type { UiSdk, PageDefinition } from "./types";

const registeredPages: Map<string, PageDefinition> = new Map();

export function createUiSdk(): UiSdk {
  return {
    registerPage(page: PageDefinition): void {
      if (registeredPages.has(page.name)) {
        throw new Error(`Page "${page.name}" is already registered.`);
      }
      registeredPages.set(page.name, page);
      console.log(`[UI] Registered page: ${page.name} at ${page.path}`);
    },
  };
}

export function getRegisteredPages(): PageDefinition[] {
  return Array.from(registeredPages.values());
}
