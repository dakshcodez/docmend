import { extname } from 'node:path';
import { isTestFile } from '../shared/is-test-file.js';
import { walkFiles } from '../shared/walk-files.js';
import type { GrammarId } from './types.js';

const EXTENSION_TO_GRAMMAR: Record<string, GrammarId> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
};

export interface SourceFile {
  absolutePath: string;
  relativePath: string;
  grammar: GrammarId;
}

export function resolveGrammar(filePath: string): GrammarId | undefined {
  return EXTENSION_TO_GRAMMAR[extname(filePath)];
}

export async function walkSourceFiles(rootDir: string): Promise<SourceFile[]> {
  const files = await walkFiles(rootDir, (name) => extname(name) in EXTENSION_TO_GRAMMAR);
  return files
    .filter((file) => !isTestFile(file.relativePath))
    .map((file) => ({
      ...file,
      grammar: EXTENSION_TO_GRAMMAR[extname(file.relativePath)],
    }));
}
