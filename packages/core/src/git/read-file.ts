import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export async function readFileAtRef(cwd: string, ref: string, path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['show', `${ref}:${path}`], {
      cwd,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return stdout;
  } catch {
    return null;
  }
}

export async function readStagedFile(cwd: string, path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['show', `:${path}`], { cwd, maxBuffer: MAX_BUFFER_BYTES });
    return stdout;
  } catch {
    return null;
  }
}

export async function readWorkingTreeFile(cwd: string, path: string): Promise<string | null> {
  try {
    return await readFile(join(cwd, path), 'utf8');
  } catch {
    return null;
  }
}
