import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuild's ESM output has no real `require`, so its internal shim throws
// whenever a bundled CJS dependency calls require() for something it can't
// statically resolve (e.g. the `tunnel` package, pulled in transitively via
// @actions/http-client's proxy support, does `require('net')` etc.). This
// banner gives the bundle a genuine `require` to find - esbuild's own
// documented fix for this exact class of error - so the output can stay ESM
// (needed for import.meta.url, which @docmend/core's wasm-path resolution
// depends on, and which esbuild empties out under CJS output instead).
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  external: ['@huggingface/transformers'],
  outfile: 'dist/index.js',
  banner: {
    // Aliased import: @docmend/core's grammar-loader.ts already imports
    // createRequire under its own name, and gets bundled into this same
    // module scope - importing it again under the unaliased name here
    // would be a duplicate declaration (SyntaxError), not just a harmless
    // redundant import.
    js: "import { createRequire as __docmendCreateRequire } from 'module'; const require = __docmendCreateRequire(import.meta.url);",
  },
});

// Resolved from @docmend/core's own location (not this script's) so it works
// regardless of where npm happened to hoist these transitive dependencies.
const coreEntry = fileURLToPath(import.meta.resolve('@docmend/core'));
const coreRequire = createRequire(coreEntry);

const wasmFiles = [
  coreRequire.resolve('web-tree-sitter/tree-sitter.wasm'),
  coreRequire.resolve('tree-sitter-wasms/out/tree-sitter-typescript.wasm'),
  coreRequire.resolve('tree-sitter-wasms/out/tree-sitter-tsx.wasm'),
  coreRequire.resolve('tree-sitter-wasms/out/tree-sitter-javascript.wasm'),
  coreRequire.resolve('tree-sitter-wasms/out/tree-sitter-python.wasm'),
];

for (const file of wasmFiles) {
  copyFileSync(file, join('dist', basename(file)));
}

console.log(`copied ${wasmFiles.length} wasm files into dist/`);
