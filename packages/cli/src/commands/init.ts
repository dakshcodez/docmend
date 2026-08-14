import { access, chmod, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOOK_SCRIPT = '#!/bin/sh\nnpx seal check\n';

async function fileExists(path: string): Promise<boolean> {
  return access(path, constants.F_OK).then(
    () => true,
    () => false,
  );
}

export async function init(cwd: string): Promise<number> {
  const hooksDir = join(cwd, '.git', 'hooks');
  await mkdir(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, 'pre-commit');

  if (await fileExists(hookPath)) {
    console.error(
      `seal: ${hookPath} already exists - not overwriting it. Add "npx seal check" to it manually instead.`,
    );
    return 1;
  }

  await writeFile(hookPath, HOOK_SCRIPT, 'utf8');
  await chmod(hookPath, 0o755);
  console.log(`seal: installed pre-commit hook at ${hookPath}`);
  return 0;
}
