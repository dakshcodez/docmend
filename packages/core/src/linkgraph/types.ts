import type { DocSection } from '../docs/index.js';
import type { CodeChunk } from '../parsing/index.js';

export type LinkMethod = 'heuristic' | 'embedding';

export interface Link {
  chunkId: string;
  sectionId: string;
  method: LinkMethod;
  score: number;
}

export interface LinkGraph {
  chunks: CodeChunk[];
  sections: DocSection[];
  links: Link[];
}
