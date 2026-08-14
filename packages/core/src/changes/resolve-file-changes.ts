import type { ChangedFile } from '../git/index.js';
import type { FileChange } from './types.js';

export async function resolveFileChanges(
  changedFiles: ChangedFile[],
  readOld: (path: string) => Promise<string | null>,
  readNew: (path: string) => Promise<string | null>,
): Promise<FileChange[]> {
  return Promise.all(
    changedFiles.map(async (file) => ({
      filePath: file.path,
      oldContent: file.status === 'added' ? null : await readOld(file.oldPath ?? file.path),
      newContent: file.status === 'deleted' ? null : await readNew(file.path),
    })),
  );
}
