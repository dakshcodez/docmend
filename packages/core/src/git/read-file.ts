import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { assertSafeGitRef } from './safety.js';

const execFileAsync = promisify(execFile);
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

const MISSING_PATH_PATTERN = /does not exist/i;

function isMissingPathError(error: unknown): boolean {
  const stderr = (error as { stderr?: string } | undefined)?.stderr ?? '';
  return MISSING_PATH_PATTERN.test(stderr);
}

export async function readFileAtRef(cwd: string, ref: string, path: string): Promise<string | null> {
  assertSafeGitRef(ref, 'ref');
  try {
    const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], {
      cwd,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return stdout;
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }
}

export async function readStagedFile(cwd: string, path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['show', `:${path}`], { cwd, maxBuffer: MAX_BUFFER_BYTES });
    return stdout;
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }
}

export async function readWorkingTreeFile(cwd: string, path: string): Promise<string | null> {
  try {
    return await readFile(join(cwd, path), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
