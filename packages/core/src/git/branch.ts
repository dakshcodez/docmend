import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertSafeGitRef } from './safety.js';

const execFileAsync = promisify(execFile);

export async function configureGitIdentity(cwd: string, name: string, email: string): Promise<void> {
  await execFileAsync('git', ['config', 'user.name', name], { cwd });
  await execFileAsync('git', ['config', 'user.email', email], { cwd });
}

export async function createBranch(cwd: string, branchName: string, fromRef: string): Promise<void> {
  assertSafeGitRef(branchName, 'branchName');
  assertSafeGitRef(fromRef, 'fromRef');
  await execFileAsync('git', ['checkout', '-b', branchName, fromRef], { cwd });
}

export async function checkoutRef(cwd: string, ref: string): Promise<void> {
  assertSafeGitRef(ref, 'ref');
  await execFileAsync('git', ['checkout', ref], { cwd });
}

export async function commit(cwd: string, message: string): Promise<void> {
  await execFileAsync('git', ['commit', '-m', message], { cwd });
}

export async function push(cwd: string, branchName: string): Promise<void> {
  assertSafeGitRef(branchName, 'branchName');
  await execFileAsync('git', ['push', 'origin', branchName], { cwd });
}
