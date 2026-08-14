import { join } from 'node:path';
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import {
  GeminiClient,
  buildLinkGraph,
  detectChanges,
  getDiffBetweenRefs,
  isIgnored,
  loadIgnorePatterns,
  parseCodebase,
  parseDocs,
  readFileAtRef,
  repairStaleDocs,
  resolveFileChanges,
} from '@seal/core';
import { postSummaryComment } from './comment.js';
import { loadConfig } from './config.js';
import { createFixPr } from './fix-pr.js';
import { loadPrContext } from './pr-context.js';

async function run(): Promise<void> {
  const config = loadConfig();
  const ctx = loadPrContext();
  const cwd = process.cwd();

  const octokit = getOctokit(config.githubToken);
  const llm = new GeminiClient({ apiKey: config.apiKey });

  core.info('seal: building code-to-docs link graph...');
  const chunks = await parseCodebase(cwd);
  const sections = await parseDocs(cwd);
  const graph = await buildLinkGraph(chunks, sections, {
    llm,
    embeddingIndexPath: join(cwd, '.seal', 'vectra-index'),
  });

  const changedFiles = await getDiffBetweenRefs(cwd, ctx.baseSha, ctx.headSha);
  const ignorePatterns = await loadIgnorePatterns(cwd);
  const relevantFiles = changedFiles.filter((file) => !isIgnored(file.path, ignorePatterns));

  if (relevantFiles.length === 0) {
    core.info('seal: no relevant changes in this PR.');
    core.setOutput('stale-sections-found', 0);
    core.setOutput('corrections-generated', 0);
    return;
  }

  const fileChanges = await resolveFileChanges(
    relevantFiles,
    (path) => readFileAtRef(cwd, ctx.baseSha, path),
    (path) => readFileAtRef(cwd, ctx.headSha, path),
  );

  const { suspects, verdicts } = await detectChanges({ fileChanges, linkGraph: graph, llm });
  const staleVerdicts = verdicts.filter((verdict) => verdict.stale);

  core.setOutput('stale-sections-found', staleVerdicts.length);

  if (staleVerdicts.length === 0) {
    core.info('seal: docs look accurate for this PR.');
    core.setOutput('corrections-generated', 0);
    return;
  }

  const repairResults = await repairStaleDocs(suspects, verdicts, llm, {
    confidenceThreshold: config.confidenceThreshold,
  });
  core.setOutput('corrections-generated', repairResults.filter((result) => result.correction).length);

  const autoFixResults = repairResults.filter(
    (result) => result.correction?.mode === 'auto-fix' && result.validation?.valid,
  );
  const reviewNeeded = repairResults.filter(
    (result) => result.correction && !(result.correction.mode === 'auto-fix' && result.validation?.valid),
  );
  const failed = repairResults.filter((result) => !result.correction);

  const fixPr = await createFixPr(cwd, octokit, graph, ctx, autoFixResults, config.autoMerge);

  await postSummaryComment(octokit, ctx, { verdicts, reviewNeeded, failed, fixPr });

  core.info('seal: doc check complete.');
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
