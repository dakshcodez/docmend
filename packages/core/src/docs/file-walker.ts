import { extname } from 'node:path';
import { walkFiles } from '../shared/walk-files.js';

const CHANGELOG_FILE_PATTERN = /(^|\/)(changelog|changes|history|releases)\.md$/i;

export interface DocFile {
  absolutePath: string;
  relativePath: string;
}

export function isChangelogFile(filePath: string): boolean {
  return CHANGELOG_FILE_PATTERN.test(filePath);
}

export async function walkDocFiles(rootDir: string): Promise<DocFile[]> {
  const files = await walkFiles(rootDir, (name) => extname(name) === '.md');
  return files.filter((file) => !isChangelogFile(file.relativePath));
}
