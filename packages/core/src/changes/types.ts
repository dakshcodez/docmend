import type { DocSection } from '../docs/index.js';
import type { CodeChunk } from '../parsing/index.js';

export type ChunkChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface FileChange {
  filePath: string;
  oldContent: string | null;
  newContent: string | null;
}

export interface ChunkDiff {
  chunkId: string;
  filePath: string;
  changeType: ChunkChangeType;
  oldChunk: CodeChunk | null;
  newChunk: CodeChunk | null;
}

export interface Suspect {
  chunkDiff: ChunkDiff;
  section: DocSection;
}

export interface StalenessVerdict {
  sectionId: string;
  chunkId: string;
  stale: boolean;
  explanation: string;
  error?: string;
}
