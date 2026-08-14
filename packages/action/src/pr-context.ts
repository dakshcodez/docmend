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
