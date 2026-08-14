import type { LinkGraph } from '../linkgraph/index.js';
import { compositeKey } from '../shared/composite-key.js';
import type { ChunkDiff, Suspect } from './types.js';

export function findSuspectSections(meaningfulDiffs: ChunkDiff[], graph: LinkGraph): Suspect[] {
  const sectionsById = new Map(graph.sections.map((section) => [section.id, section]));
  const seen = new Set<string>();
  const suspects: Suspect[] = [];

  for (const diff of meaningfulDiffs) {
    for (const link of graph.links) {
      if (link.chunkId !== diff.chunkId) continue;

      const section = sectionsById.get(link.sectionId);
      if (!section) continue;

      const key = compositeKey(diff.chunkId, section.id);
      if (seen.has(key)) continue;
      seen.add(key);

      suspects.push({ chunkDiff: diff, section });
    }
  }

  return suspects;
}
