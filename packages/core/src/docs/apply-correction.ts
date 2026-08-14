import { readFile, writeFile } from 'node:fs/promises';
import type { DocSection } from './types.js';

export async function applySectionCorrection(
  absoluteFilePath: string,
  section: DocSection,
  newContent: string,
): Promise<void> {
  const original = await readFile(absoluteFilePath, 'utf8');
  const lines = original.split('\n');

  const before = lines.slice(0, section.startLine);
  const after = lines.slice(section.endLine);
  const replacement = newContent.split('\n');

  const updated = [...before, ...replacement, '', ...after].join('\n');
  await writeFile(absoluteFilePath, updated, 'utf8');
}
