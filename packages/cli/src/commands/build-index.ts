import { join } from 'node:path';
import type { LLMClient } from '@seal/core';
import { GeminiClient, buildLinkGraph, parseCodebase, parseDocs, saveLinkGraph } from '@seal/core';

export interface BuildIndexOptions {
  cwd: string;
  apiKey?: string;
  llm?: LLMClient;
}

export async function buildIndex(options: BuildIndexOptions): Promise<number> {
  if (!options.llm && !options.apiKey) {
    console.error('seal: no Gemini API key found. Set SEAL_GEMINI_API_KEY or GEMINI_API_KEY.');
    return 1;
  }

  const chunks = await parseCodebase(options.cwd);
  const sections = await parseDocs(options.cwd);
  const llm = options.llm ?? new GeminiClient({ apiKey: options.apiKey });

  const graph = await buildLinkGraph(chunks, sections, {
    llm,
    embeddingIndexPath: join(options.cwd, '.seal', 'vectra-index'),
  });

  await saveLinkGraph(graph, join(options.cwd, '.seal', 'link-graph.json'));
  console.log(`seal: indexed ${chunks.length} code chunks and ${sections.length} doc sections.`);
  return 0;
}
