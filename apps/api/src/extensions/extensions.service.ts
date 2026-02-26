import { Injectable } from "@nestjs/common";
import { ExtensionLoader } from "@opencodeapp/ext";
import * as path from "path";

@Injectable()
export class ExtensionsService {
  private readonly loader: ExtensionLoader;

  constructor() {
    const repoRoot = process.env["REPO_ROOT"] ?? path.resolve(__dirname, "../../../../");
    this.loader = new ExtensionLoader(path.join(repoRoot, "tenants"));
  }

  listExtensions(tenantId: string) {
    return this.loader.load(tenantId).map((ext) => ({
      name: ext.manifest.name,
      version: ext.manifest.version,
      description: ext.manifest.description,
      capabilities: ext.manifest.capabilities,
      pages: ext.manifest.pages ?? [],
      routes: ext.manifest.routes ?? [],
    }));
  }
}
