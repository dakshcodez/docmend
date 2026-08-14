import type { GitHub } from '@actions/github/lib/utils';
import type { RepairResult, StalenessVerdict } from '@seal/core';
import type { FixPrResult } from './fix-pr.js';
import type { PrContext } from './pr-context.js';

export interface CommentSummary {
  verdicts: StalenessVerdict[];
  reviewNeeded: RepairResult[];
  failed: RepairResult[];
  fixPr: FixPrResult | null;
  fixPrError?: string;
}

export async function postSummaryComment(
  octokit: InstanceType<typeof GitHub>,
  ctx: PrContext,
  summary: CommentSummary,
): Promise<void> {
  const verifiedAccurate = summary.verdicts.filter((verdict) => !verdict.stale).length;
  const autoFixed = summary.fixPr?.appliedSectionIds.length ?? 0;

  const parts = [`${verifiedAccurate} section(s) verified accurate`];
  if (autoFixed > 0 && summary.fixPr) {
    parts.push(`${autoFixed} auto-fixed (see #${summary.fixPr.prNumber})`);
  }
  if (summary.reviewNeeded.length > 0) {
    parts.push(`${summary.reviewNeeded.length} flagged for review`);
  }
  if (summary.failed.length > 0) {
    parts.push(`${summary.failed.length} failed to repair`);
  }

  const lines = ['## Doc Check Results', '', `${parts.join(', ')}.`];

  if (summary.fixPrError) {
    lines.push('', `Could not open the auto-fix PR: ${summary.fixPrError}`);
  }

  if (summary.fixPr?.mergeError) {
    lines.push('', `Auto-merge of #${summary.fixPr.prNumber} failed: ${summary.fixPr.mergeError}`);
  }

  if (summary.reviewNeeded.length > 0) {
    lines.push('', '### Needs human review');
    for (const result of summary.reviewNeeded) {
      lines.push(`- \`${result.sectionId}\`: ${result.correction?.rationale ?? result.error ?? 'unspecified'}`);
    }
  }

  if (summary.failed.length > 0) {
    lines.push('', '### Failed to repair');
    for (const result of summary.failed) {
      lines.push(`- \`${result.sectionId}\`: ${result.error ?? 'unknown error'}`);
    }
  }

  await octokit.rest.issues.createComment({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: ctx.prNumber,
    body: lines.join('\n'),
  });
}
