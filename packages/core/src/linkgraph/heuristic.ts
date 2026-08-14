import type { DocSection } from '../docs/index.js';
import type { CodeChunk } from '../parsing/index.js';
import type { Link } from './types.js';

function normalizeReference(reference: string): string {
  return reference
    .replace(/\(.*$/, '')
    .replace(/[.:,;!?]+$/, '')
    .trim();
}

function symbolPath(chunk: CodeChunk): string | undefined {
  return chunk.id.split('#')[1];
}

function buildChunksByName(chunks: CodeChunk[]): Map<string, CodeChunk[]> {
  const chunksByName = new Map<string, CodeChunk[]>();
  for (const chunk of chunks) {
    for (const key of new Set([chunk.name, symbolPath(chunk)])) {
      if (!key) continue;
      const existing = chunksByName.get(key);
      if (existing) {
        existing.push(chunk);
      } else {
        chunksByName.set(key, [chunk]);
      }
    }
  }
  return chunksByName;
}

export function buildHeuristicLinks(chunks: CodeChunk[], sections: DocSection[]): Link[] {
  const chunksByName = buildChunksByName(chunks);
  const seen = new Set<string>();
  const links: Link[] = [];

  for (const section of sections) {
    for (const rawReference of section.codeReferences) {
      const matchedChunks = chunksByName.get(normalizeReference(rawReference));
      if (!matchedChunks) continue;

      for (const chunk of matchedChunks) {
        const key = `${chunk.id}|${section.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ chunkId: chunk.id, sectionId: section.id, method: 'heuristic', score: 1 });
      }
    }
  }

  return links;
}
