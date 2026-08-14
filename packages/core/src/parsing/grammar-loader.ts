import { createRequire } from 'node:module';
import { Language, Parser } from 'web-tree-sitter';
import type { GrammarId } from './types.js';

const require = createRequire(import.meta.url);

const GRAMMAR_WASM_PATHS: Record<GrammarId, string> = {
  typescript: require.resolve('tree-sitter-wasms/out/tree-sitter-typescript.wasm'),
  tsx: require.resolve('tree-sitter-wasms/out/tree-sitter-tsx.wasm'),
  javascript: require.resolve('tree-sitter-wasms/out/tree-sitter-javascript.wasm'),
  python: require.resolve('tree-sitter-wasms/out/tree-sitter-python.wasm'),
};

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
    cached = Language.load(GRAMMAR_WASM_PATHS[grammar]);
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
