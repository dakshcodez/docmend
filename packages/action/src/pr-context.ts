import { context } from '@actions/github';

export interface PrContext {
  owner: string;
  repo: string;
  prNumber: number;
  baseSha: string;
  headSha: string;
  headRef: string;
}

export function loadPrContext(): PrContext {
  // pull_request_target carries the same payload shape but runs with the
  // base repo's privileged token against an untrusted head - this action's
  // whole design (checking out and diffing the head SHA, then pushing and
  // opening a PR) assumes standard pull_request trust semantics.
  if (context.eventName !== 'pull_request') {
    throw new Error(
      `seal action must be triggered by a "pull_request" event, got "${context.eventName}". ` +
        'Using "pull_request_target" here would run untrusted PR content with this repo\'s privileged token.',
    );
  }

  const pr = context.payload.pull_request as
    | { number: number; base?: { sha?: unknown; ref?: unknown }; head?: { sha?: unknown; ref?: unknown } }
    | undefined;

  if (!pr) {
    throw new Error('seal action must be triggered by a pull_request event');
  }

  const baseSha = pr.base?.sha;
  const headSha = pr.head?.sha;
  const headRef = pr.head?.ref;

  if (typeof baseSha !== 'string' || typeof headSha !== 'string' || typeof headRef !== 'string') {
    throw new Error('pull_request payload is missing base/head ref information');
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNumber: pr.number,
    baseSha,
    headSha,
    headRef,
  };
}
