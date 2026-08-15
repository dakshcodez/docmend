import { join } from 'node:path';
import type { LLMClient } from '@docmend/core';
import { GeminiClient, buildLinkGraph, parseCodebase, parseDocs, saveLinkGraph } from '@docmend/core';

export interface BuildIndexOptions {
  cwd: string;
  apiKey?: string;
  llm?: LLMClient;
}

export async function buildIndex(options: BuildIndexOptions): Promise<number> {
  if (!options.llm && !options.apiKey) {
    console.error('docmend: no Gemini API key found. Set DOCMEND_GEMINI_API_KEY or GEMINI_API_KEY.');
    return 1;
  }

  const chunks = await parseCodebase(options.cwd);
  const sections = await parseDocs(options.cwd);
  const llm = options.llm ?? new GeminiClient({ apiKey: options.apiKey });

  const graph = await buildLinkGraph(chunks, sections, {
    llm,
    embeddingIndexPath: join(options.cwd, '.docmend', 'vectra-index'),
  });

  await saveLinkGraph(graph, join(options.cwd, '.docmend', 'link-graph.json'));
  console.log(`docmend: indexed ${chunks.length} code chunks and ${sections.length} doc sections.`);
  return 0;
}
