export type { Link, LinkGraph, LinkMethod } from './types.js';
export { buildHeuristicLinks } from './heuristic.js';
export { buildEmbeddingLinks } from './embedding.js';
export type { EmbeddingLinkOptions } from './embedding.js';
export { buildLinkGraph } from './build.js';
export type { BuildLinkGraphOptions } from './build.js';
export { loadLinkGraph, saveLinkGraph } from './persist.js';
