import type { GitHub } from '@actions/github/lib/utils';
import type { LinkGraph, RepairResult } from '@seal/core';
import { applyCorrectionToRepo, commit, configureGitIdentity, createBranch, push } from '@seal/core';
import type { PrContext } from './pr-context.js';

const BOT_NAME = 'github-actions[bot]';
const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';

export interface FixPrResult {
  branchName: string;
  prNumber: number;
  prUrl: string;
  appliedSectionIds: string[];
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

  const branchName = `seal/doc-fixes-${Date.now()}`;
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

  if (appliedSectionIds.length === 0) return null;

  await commit(cwd, 'docs: auto-fix stale documentation via seal');
  await push(cwd, branchName);

  const body = [
    'Automated documentation fixes from seal for this PR.',
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

  if (autoMerge) {
    await octokit.rest.pulls.merge({ owner: ctx.owner, repo: ctx.repo, pull_number: fixPr.number });
  }

  return { branchName, prNumber: fixPr.number, prUrl: fixPr.html_url, appliedSectionIds };
}
