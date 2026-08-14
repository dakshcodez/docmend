import type { DocSection } from '../docs/index.js';
import type { LLMClient } from '../llm/index.js';
import type { CodeChunk } from '../parsing/index.js';
import { buildEmbeddingLinks } from './embedding.js';
import { buildHeuristicLinks } from './heuristic.js';
import type { LinkGraph } from './types.js';

export interface BuildLinkGraphOptions {
  llm: LLMClient;
  embeddingIndexPath: string;
  similarityThreshold?: number;
  topK?: number;
}

export async function buildLinkGraph(
  chunks: CodeChunk[],
  sections: DocSection[],
  options: BuildLinkGraphOptions,
): Promise<LinkGraph> {
  const heuristicLinks = buildHeuristicLinks(chunks, sections);
  const embeddingLinks = await buildEmbeddingLinks(chunks, sections, options.llm, {
    indexFolderPath: options.embeddingIndexPath,
    similarityThreshold: options.similarityThreshold,
    topK: options.topK,
  });

  return {
    chunks,
    sections,
    links: [...heuristicLinks, ...embeddingLinks],
  };
}
