import path from 'path';
import fs from 'fs';
import { build } from 'esbuild';

const SHIMS_DIR = path.join(__dirname, '..', 'shims');

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

/**
 * Build a browser IIFE that reuses the host page's React via window globals.
 */
export async function buildExtensionHostBundle(
  entryPoint: string,
  outDir: string,
): Promise<string> {
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'host-bundle.js');

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outFile,
    platform: 'browser',
    format: 'iife',
    globalName: 'OpenCodeAppExtension',
    target: 'es2020',
    jsx: 'automatic',
    minify: false,
    sourcemap: false,
    // Ensure the host can always read the export from globalThis
    footer: {
      js: 'globalThis.OpenCodeAppExtension = OpenCodeAppExtension;',
    },
    alias: {
      react: path.join(SHIMS_DIR, 'react.js'),
      'react-dom': path.join(SHIMS_DIR, 'react-dom.js'),
      'react-dom/client': path.join(SHIMS_DIR, 'react-dom-client.js'),
      'react/jsx-runtime': path.join(SHIMS_DIR, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(SHIMS_DIR, 'jsx-runtime.js'),
    },
  });

  return outFile;
}