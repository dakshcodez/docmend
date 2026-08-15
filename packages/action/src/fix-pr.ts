import type { GitHub } from '@actions/github/lib/utils';
import type { LinkGraph, RepairResult } from '@docmend/core';
import { applyCorrectionToRepo, checkoutRef, commit, configureGitIdentity, createBranch, push } from '@docmend/core';
import type { PrContext } from './pr-context.js';

const BOT_NAME = 'github-actions[bot]';
const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';

export interface FixPrResult {
  branchName: string;
  prNumber: number;
  prUrl: string;
  appliedSectionIds: string[];
  mergeError?: string;
}

export async function createFixPr(
  cwd: string,
  octokit: InstanceType<typeof GitHub>,
  graph: LinkGraph,
  ctx: PrContext,
  autoFixResults: RepairResult[],
  autoMerge: boolean,
): Promise<FixPrResult | null> {
  if (autoFixResults.length === 0) return null;

  const branchName = `docmend/doc-fixes-${Date.now()}`;
  await configureGitIdentity(cwd, BOT_NAME, BOT_EMAIL);
  // actions/checkout leaves a pull_request event in detached HEAD at the PR
  // head SHA - the branch name itself usually isn't available as a local
  // ref, so branch from the SHA. The PR API call below needs the actual
  // branch name instead, since GitHub's base/head fields aren't SHAs.
  await createBranch(cwd, branchName, ctx.headSha);

  const appliedSectionIds: string[] = [];
  for (const result of autoFixResults) {
    if (!result.correction) continue;
    const outcome = await applyCorrectionToRepo(cwd, graph, result.sectionId, result.correction.correctedContent);
    if (outcome === 'applied') {
      appliedSectionIds.push(result.sectionId);
    }
  }

  if (appliedSectionIds.length === 0) {
    // Nothing was actually applied - leave the working tree back where
    // actions/checkout put it, rather than stranded on an empty branch with
    // a mutated git identity, since a later workflow step might depend on
    // being on the original ref.
    await checkoutRef(cwd, ctx.headSha);
    return null;
  }

  await commit(cwd, 'docs: auto-fix stale documentation via docmend');
  await push(cwd, branchName);

  const body = [
    'Automated documentation fixes from docmend for this PR.',
    '',
    ...appliedSectionIds.map((id) => `- \`${id}\``),
  ].join('\n');

  const { data: fixPr } = await octokit.rest.pulls.create({
    owner: ctx.owner,
    repo: ctx.repo,
    title: 'docs: auto-fix stale documentation',
    head: branchName,
    base: ctx.headRef,
    body,
  });

  const result: FixPrResult = {
    branchName,
    prNumber: fixPr.number,
    prUrl: fixPr.html_url,
    appliedSectionIds,
  };

  if (autoMerge) {
    // The fix PR was already created successfully at this point, so a merge
    // failure (checks not run yet, branch protection, disallowed merge
    // method) shouldn't discard that - it's reported on the result instead.
    try {
      await octokit.rest.pulls.merge({ owner: ctx.owner, repo: ctx.repo, pull_number: fixPr.number });
    } catch (error) {
      result.mergeError = error instanceof Error ? error.message : String(error);
    }
  }

  return result;
}
