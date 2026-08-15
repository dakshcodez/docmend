import { access, chmod, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOOK_SCRIPT = '#!/bin/sh\nnpx docmend check\n';

async function fileExists(path: string): Promise<boolean> {
  return access(path, constants.F_OK).then(
    () => true,
    () => false,
  );
}

export async function init(cwd: string): Promise<number> {
  const gitDir = join(cwd, '.git');
  if (!(await fileExists(gitDir))) {
    console.error(`docmend: ${cwd} does not look like a git repository (no .git found).`);
    return 1;
  }

  const hooksDir = join(gitDir, 'hooks');
  await mkdir(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, 'pre-commit');

  if (await fileExists(hookPath)) {
    console.error(
      `docmend: ${hookPath} already exists - not overwriting it. Add "npx docmend check" to it manually instead.`,
    );
    return 1;
  }

  await writeFile(hookPath, HOOK_SCRIPT, 'utf8');
  await chmod(hookPath, 0o755);
  console.log(`docmend: installed pre-commit hook at ${hookPath}`);
  return 0;
}
