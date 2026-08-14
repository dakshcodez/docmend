import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function hasUnstagedChanges(cwd: string, path: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['diff', '--name-only', '--', path], { cwd });
  return stdout.trim().length > 0;
}
