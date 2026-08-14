export type { ChunkChangeType, ChunkDiff, FileChange, StalenessVerdict, Suspect } from './types.js';
export { diffChunks, diffFileChunks } from './diff-chunks.js';
export { filterMeaningfulChanges, isMeaningfulChange, isTestFile } from './filter.js';
export { findSuspectSections } from './suspects.js';
export { verifyStaleness, verifyStalenessForAll } from './staleness.js';
export { resolveFileChanges } from './resolve-file-changes.js';
export { detectChanges } from './detect.js';
export type { DetectChangesOptions, DetectChangesResult } from './detect.js';
