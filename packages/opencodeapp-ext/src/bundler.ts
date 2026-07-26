import path from 'path';
import fs from 'fs';
import { build } from 'esbuild';

export async function buildExtension(
  entryPoint: string,
  outDir: string,
): Promise<string> {
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'bundle.js');

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'next'],
    minify: false,
    sourcemap: false,
  });

  return outFile;
}
