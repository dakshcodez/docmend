import { LocalIndex } from 'vectra';
import type { DocSection } from '../docs/index.js';
import type { LLMClient } from '../llm/index.js';
import type { CodeChunk } from '../parsing/index.js';
import type { Link } from './types.js';

export interface EmbeddingLinkOptions {
  indexFolderPath: string;
  similarityThreshold?: number;
  topK?: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
const DEFAULT_TOP_K = 5;

function chunkEmbeddingText(chunk: CodeChunk): string {
  return [chunk.signature, chunk.docComment ?? ''].filter(Boolean).join('\n');
}

function sectionEmbeddingText(section: DocSection): string {
  return [section.headingPath.join(' > '), section.content].filter(Boolean).join('\n');
}

export async function buildEmbeddingLinks(
  chunks: CodeChunk[],
  sections: DocSection[],
  llm: LLMClient,
  options: EmbeddingLinkOptions,
): Promise<Link[]> {
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const topK = options.topK ?? DEFAULT_TOP_K;

  const index = new LocalIndex(options.indexFolderPath);
  if (await index.isIndexCreated()) {
    await index.deleteIndex();
  }
  await index.createIndex({ version: 1 });

  const seenChunkIds = new Set<string>();
  for (const chunk of chunks) {
    const vector = await llm.embed(chunkEmbeddingText(chunk));
    // upsert, not insert: two chunks can legitimately share an id (e.g.
    // same-named locally-scoped helpers in different function bodies) -
    // that's an inherent limit of a name-based id scheme, not a fatal error.
    // Still surfaced as a warning, since it means one of the two silently
    // becomes unlinkable rather than crashing loudly like insertItem did.
    if (seenChunkIds.has(chunk.id)) {
      console.warn(`seal: duplicate chunk id "${chunk.id}" - only the last one is linkable in the embedding index.`);
    }
    seenChunkIds.add(chunk.id);
    await index.upsertItem({ id: chunk.id, vector });
  }

  const links: Link[] = [];
  for (const section of sections) {
    const vector = await llm.embed(sectionEmbeddingText(section));
    const results = await index.queryItems(vector, '', topK);
    for (const result of results) {
      if (result.score < threshold) continue;
      links.push({
        chunkId: result.item.id,
        sectionId: section.id,
        method: 'embedding',
        score: result.score,
      });
    }
  }

  return links;
}
