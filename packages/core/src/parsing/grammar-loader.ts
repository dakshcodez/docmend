import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Language, Parser } from 'web-tree-sitter';
import type { GrammarId } from './types.js';

const require = createRequire(import.meta.url);

const GRAMMAR_WASM_FILENAMES: Record<GrammarId, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  python: 'tree-sitter-python.wasm',
};

function resolveGrammarWasmPath(grammar: GrammarId): string {
  const filename = GRAMMAR_WASM_FILENAMES[grammar];
  // When bundled (e.g. the GitHub Action ships a single committed file with
  // no node_modules alongside it), the wasm files are copied to sit next to
  // the bundle itself - same convention web-tree-sitter's own Parser.init()
  // already uses for its own runtime wasm. Prefer that local copy if present,
  // otherwise fall back to normal node_modules resolution.
  const localPath = fileURLToPath(new URL(filename, import.meta.url));
  if (existsSync(localPath)) {
    return localPath;
  }
  return require.resolve(`tree-sitter-wasms/out/${filename}`);
}

let initialized: Promise<void> | null = null;
const languageCache = new Map<GrammarId, Promise<Language>>();

async function ensureInitialized(): Promise<void> {
  initialized ??= Parser.init();
  await initialized;
}

export async function loadGrammar(grammar: GrammarId): Promise<Language> {
  await ensureInitialized();
  let cached = languageCache.get(grammar);
  if (!cached) {
    cached = Language.load(resolveGrammarWasmPath(grammar));
    languageCache.set(grammar, cached);
  }
  return cached;
}

export async function createParser(grammar: GrammarId): Promise<Parser> {
  const language = await loadGrammar(grammar);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}
