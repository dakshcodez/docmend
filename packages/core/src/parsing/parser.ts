import { readFile } from 'node:fs/promises';
import { extractChunksFromSource } from './extract.js';
import { walkSourceFiles } from './file-walker.js';
import type { CodeChunk } from './types.js';

export async function parseCodebase(rootDir: string): Promise<CodeChunk[]> {
  const files = await walkSourceFiles(rootDir);
  const allChunks: CodeChunk[] = [];
  for (const file of files) {
    const source = await readFile(file.absolutePath, 'utf8');
    const chunks = await extractChunksFromSource(source, file.relativePath, file.grammar);
    allChunks.push(...chunks);
  }
  return allChunks;
}
