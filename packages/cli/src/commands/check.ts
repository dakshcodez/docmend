import { join } from 'node:path';
import type { LinkGraph, LLMClient } from '@seal/core';
import {
  GeminiClient,
  applyCorrectionToRepo,
  detectChanges,
  getDiffBetweenRefs,
  getStagedDiff,
  isIgnored,
  loadIgnorePatterns,
  loadLinkGraph,
  readFileAtRef,
  readStagedFile,
  repairStaleDocs,
  resolveFileChanges,
} from '@seal/core';

export interface CheckOptions {
  cwd: string;
  base?: string;
  strict: boolean;
  llm?: LLMClient;
}

const LINK_GRAPH_PATH = ['.seal', 'link-graph.json'];

function resolveApiKey(): string | undefined {
  return process.env.SEAL_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
}

async function loadGraph(cwd: string): Promise<LinkGraph | null> {
  try {
    return await loadLinkGraph(join(cwd, ...LINK_GRAPH_PATH));
  } catch {
    return null;
  }
}

async function runCheck(options: CheckOptions): Promise<number> {
  const apiKey = resolveApiKey();
  if (!options.llm && !apiKey) {
    const message =
      'seal: no Gemini API key found (set SEAL_GEMINI_API_KEY or GEMINI_API_KEY) - skipping doc check.';
    if (options.strict) {
      console.error(message);
      return 1;
    }
    console.warn(message);
    return 0;
  }

  const graph = await loadGraph(options.cwd);
  if (!graph) {
    console.warn('seal: no cached link graph found. Run "seal index" first - skipping doc check.');
    return 0;
  }

  const changedFiles = options.base
    ? await getDiffBetweenRefs(options.cwd, options.base, 'HEAD')
    : await getStagedDiff(options.cwd);

  const ignorePatterns = await loadIgnorePatterns(options.cwd);
  const relevantFiles = changedFiles.filter((file) => !isIgnored(file.path, ignorePatterns));

  if (relevantFiles.length === 0) {
    console.log('seal: no relevant changes, nothing to check.');
    return 0;
  }

  const base = options.base;
  const fileChanges = base
    ? await resolveFileChanges(
        relevantFiles,
        (path) => readFileAtRef(options.cwd, base, path),
        (path) => readFileAtRef(options.cwd, 'HEAD', path),
      )
    : await resolveFileChanges(
        relevantFiles,
        (path) => readFileAtRef(options.cwd, 'HEAD', path),
        (path) => readStagedFile(options.cwd, path),
      );

  const llm = options.llm ?? new GeminiClient({ apiKey });
  const { suspects, verdicts } = await detectChanges({ fileChanges, linkGraph: graph, llm });

  const staleVerdicts = verdicts.filter((verdict) => verdict.stale);
  if (staleVerdicts.length === 0) {
    console.log('seal: docs look accurate for these changes.');
    return 0;
  }

  const repairResults = await repairStaleDocs(suspects, verdicts, llm);

  let autoFixed = 0;
  let needsReview = 0;
  let failed = 0;

  for (const result of repairResults) {
    if (!result.correction) {
      failed += 1;
      console.error(`seal: could not repair "${result.sectionId}" - ${result.error}`);
      continue;
    }

    if (result.correction.mode === 'auto-fix' && result.validation?.valid) {
      const outcome = await applyCorrectionToRepo(
        options.cwd,
        graph,
        result.sectionId,
        result.correction.correctedContent,
      );
      if (outcome === 'applied') {
        autoFixed += 1;
        console.log(`seal: auto-fixed "${result.sectionId}"`);
        continue;
      }
      if (outcome === 'skipped-partial-stage') {
        console.warn(
          `seal: "${result.sectionId}" has unstaged changes in the same file - skipping auto-fix to avoid staging unintended changes. Needs manual review.`,
        );
      } else {
        console.warn(`seal: could not locate "${result.sectionId}" in its current file - flagging for review instead.`);
      }
    }

    needsReview += 1;
    console.log(`seal: "${result.sectionId}" needs manual review - ${result.correction.rationale}`);
  }

  console.log(`seal: ${autoFixed} auto-fixed, ${needsReview} need review, ${failed} failed.`);

  if (options.strict && (needsReview > 0 || failed > 0)) {
    return 1;
  }
  return 0;
}

export async function check(options: CheckOptions): Promise<number> {
  if (process.env.SEAL_SKIP) {
    console.log('seal: SEAL_SKIP set, skipping doc check.');
    return 0;
  }

  try {
    return await runCheck(options);
  } catch (error) {
    const message = `seal: doc check failed unexpectedly - ${error instanceof Error ? error.message : String(error)}`;
    if (options.strict) {
      console.error(message);
      return 1;
    }
    console.warn(message);
    return 0;
  }
}
