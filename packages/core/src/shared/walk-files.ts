import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
]);

export interface WalkedFile {
  absolutePath: string;
  relativePath: string;
}

export async function walkFiles(
  rootDir: string,
  matches: (fileName: string) => boolean,
): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        await walk(join(dir, entry.name));
        continue;
      }
      if (!matches(entry.name)) continue;
      const absolutePath = join(dir, entry.name);
      results.push({ absolutePath, relativePath: relative(rootDir, absolutePath) });
    }
  }

  await walk(rootDir);
  return results;
}
