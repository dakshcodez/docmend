import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function stageFile(cwd: string, path: string): Promise<void> {
  await execFileAsync('git', ['add', '--', path], { cwd });
}
