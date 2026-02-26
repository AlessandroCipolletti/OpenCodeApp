import * as path from "path";
import * as fs from "fs";

export interface BundleResult {
  extensionName: string;
  outputDir: string;
  files: string[];
}

/**
 * Simple bundler that copies extension source files to an output directory.
 * In production, this would integrate with esbuild or webpack.
 */
export class ExtensionBundler {
  constructor(private readonly outputRoot: string) {}

  async bundle(extensionDir: string, extensionName: string): Promise<BundleResult> {
    const outputDir = path.join(this.outputRoot, extensionName);
    fs.mkdirSync(outputDir, { recursive: true });

    const files = this.copyDirectory(extensionDir, outputDir);

    return { extensionName, outputDir, files };
  }

  private copyDirectory(src: string, dest: string): string[] {
    const collected: string[] = [];
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        collected.push(...this.copyDirectory(srcPath, destPath));
      } else {
        fs.copyFileSync(srcPath, destPath);
        collected.push(destPath);
      }
    }

    return collected;
  }
}
