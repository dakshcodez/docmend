import { extname } from 'node:path';
import { walkFiles } from '../shared/walk-files.js';

export interface DocFile {
  absolutePath: string;
  relativePath: string;
}

export async function walkDocFiles(rootDir: string): Promise<DocFile[]> {
  return walkFiles(rootDir, (name) => extname(name) === '.md');
}
