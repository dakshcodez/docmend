import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertSafeGitRef } from './safety.js';
import type { ChangedFile } from './types.js';

const execFileAsync = promisify(execFile);
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

function parseNameStatus(output: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const code = parts[0];

    if (code.startsWith('R')) {
      files.push({ path: parts[2], oldPath: parts[1], status: 'renamed' });
    } else if (code === 'A') {
      files.push({ path: parts[1], status: 'added' });
    } else if (code === 'D') {
      files.push({ path: parts[1], status: 'deleted' });
    } else {
      files.push({ path: parts[1], status: 'modified' });
    }
  }
  return files;
}

export async function getDiffBetweenRefs(
  cwd: string,
  baseRef: string,
  headRef: string,
): Promise<ChangedFile[]> {
  assertSafeGitRef(baseRef, 'baseRef');
  assertSafeGitRef(headRef, 'headRef');
  const { stdout } = await execFileAsync('git', ['diff', '--name-status', baseRef, headRef], {
    cwd,
    maxBuffer: MAX_BUFFER_BYTES,
  });
  return parseNameStatus(stdout);
}

export async function getStagedDiff(cwd: string): Promise<ChangedFile[]> {
  const { stdout } = await execFileAsync('git', ['diff', '--name-status', '--staged'], {
    cwd,
    maxBuffer: MAX_BUFFER_BYTES,
  });
  return parseNameStatus(stdout);
}
