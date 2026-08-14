import { readFile } from 'node:fs/promises';
import { walkDocFiles } from './file-walker.js';
import { parseMarkdownSections } from './markdown-parser.js';
import type { DocSection } from './types.js';

export async function parseDocs(rootDir: string): Promise<DocSection[]> {
  const files = await walkDocFiles(rootDir);
  const allSections: DocSection[] = [];
  for (const file of files) {
    const markdown = await readFile(file.absolutePath, 'utf8');
    allSections.push(...parseMarkdownSections(markdown, file.relativePath));
  }
  return allSections;
}
