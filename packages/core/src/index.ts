export const CORE_VERSION = '0.1.0';

export type { CompleteOptions, LLMClient, GeminiClientOptions } from './llm/index.js';
export { GeminiClient, parseJsonResponse } from './llm/index.js';

export type { ChunkKind, CodeChunk, GrammarId, SourceFile, SupportedLanguage } from './parsing/index.js';
export { extractChunksFromSource, parseCodebase, walkSourceFiles } from './parsing/index.js';

export type { DocFile, DocSection } from './docs/index.js';
export {
  applySectionCorrection,
  extractCodeReferences,
  parseDocs,
  parseMarkdownSections,
  walkDocFiles,
} from './docs/index.js';

export type { BuildLinkGraphOptions, EmbeddingLinkOptions, Link, LinkGraph, LinkMethod } from './linkgraph/index.js';
export {
  buildEmbeddingLinks,
  buildHeuristicLinks,
  buildLinkGraph,
  loadLinkGraph,
  saveLinkGraph,
} from './linkgraph/index.js';

export type { ChangedFile, ChangedFileStatus } from './git/index.js';
export {
  getDiffBetweenRefs,
  getStagedDiff,
  hasUnstagedChanges,
  readFileAtRef,
  readStagedFile,
  readWorkingTreeFile,
  stageFile,
} from './git/index.js';

export { isIgnored, loadIgnorePatterns } from './config/index.js';

export type {
  ChunkChangeType,
  ChunkDiff,
  DetectChangesOptions,
  DetectChangesResult,
  FileChange,
  StalenessVerdict,
  Suspect,
} from './changes/index.js';
export {
  detectChanges,
  diffChunks,
  diffFileChunks,
  filterMeaningfulChanges,
  findSuspectSections,
  isMeaningfulChange,
  isTestFile,
  resolveFileChanges,
  verifyStaleness,
  verifyStalenessForAll,
} from './changes/index.js';

export type { Correction, CorrectionMode, RepairResult, ValidationResult } from './repair/index.js';
export { generateCorrection, repairSection, repairStaleDocs, validateCorrection } from './repair/index.js';
