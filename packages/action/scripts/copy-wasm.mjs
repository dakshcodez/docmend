import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved from @seal/core's own location (not this script's) so it works
// regardless of where npm happened to hoist these transitive dependencies.
const coreEntry = fileURLToPath(import.meta.resolve('@seal/core'));
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
