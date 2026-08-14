import type { LinkGraph } from '../linkgraph/index.js';
import type { LLMClient } from '../llm/index.js';
import { diffChunks } from './diff-chunks.js';
import { filterMeaningfulChanges } from './filter.js';
import { findSuspectSections } from './suspects.js';
import { verifyStalenessForAll } from './staleness.js';
import type { ChunkDiff, FileChange, StalenessVerdict, Suspect } from './types.js';

export interface DetectChangesOptions {
  fileChanges: FileChange[];
  linkGraph: LinkGraph;
  llm: LLMClient;
}

export interface DetectChangesResult {
  chunkDiffs: ChunkDiff[];
  meaningfulDiffs: ChunkDiff[];
  suspects: Suspect[];
  verdicts: StalenessVerdict[];
}

export async function detectChanges(options: DetectChangesOptions): Promise<DetectChangesResult> {
  const chunkDiffs = await diffChunks(options.fileChanges);
  const meaningfulDiffs = filterMeaningfulChanges(chunkDiffs);
  const suspects = findSuspectSections(meaningfulDiffs, options.linkGraph);
  const verdicts = await verifyStalenessForAll(suspects, options.llm);

  return { chunkDiffs, meaningfulDiffs, suspects, verdicts };
}
