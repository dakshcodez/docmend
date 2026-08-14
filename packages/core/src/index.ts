export const CORE_VERSION = '0.1.0';

export type { CompleteOptions, LLMClient, GeminiClientOptions } from './llm/index.js';
export { GeminiClient } from './llm/index.js';

export type { ChunkKind, CodeChunk, GrammarId, SourceFile, SupportedLanguage } from './parsing/index.js';
export { extractChunksFromSource, parseCodebase, walkSourceFiles } from './parsing/index.js';

export type { DocFile, DocSection } from './docs/index.js';
export { extractCodeReferences, parseDocs, parseMarkdownSections, walkDocFiles } from './docs/index.js';

export type { BuildLinkGraphOptions, EmbeddingLinkOptions, Link, LinkGraph, LinkMethod } from './linkgraph/index.js';
export {
  buildEmbeddingLinks,
  buildHeuristicLinks,
  buildLinkGraph,
  loadLinkGraph,
  saveLinkGraph,
} from './linkgraph/index.js';
