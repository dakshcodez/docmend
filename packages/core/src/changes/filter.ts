import { resolveGrammar } from '../parsing/index.js';
import type { GrammarId } from '../parsing/index.js';
import type { ChunkDiff } from './types.js';

const TEST_FILE_PATTERN = /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[^/]+$/;

const LINE_COMMENT_PATTERNS: Record<GrammarId, RegExp | null> = {
  typescript: /\/\/.*$/gm,
  tsx: /\/\/.*$/gm,
  javascript: /\/\/.*$/gm,
  python: /#.*$/gm,
};

const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath);
}

function stripComments(source: string, grammar: GrammarId): string {
  let result = source.replace(BLOCK_COMMENT_PATTERN, '');
  const linePattern = LINE_COMMENT_PATTERNS[grammar];
  if (linePattern) {
    result = result.replace(linePattern, '');
  }
  return result;
}

function normalizeWhitespace(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

export function isMeaningfulChange(diff: ChunkDiff, grammar: GrammarId): boolean {
  if (diff.changeType === 'unchanged') return false;
  if (diff.changeType === 'added' || diff.changeType === 'removed') return true;

  const oldNormalized = normalizeWhitespace(stripComments(diff.oldChunk!.body, grammar));
  const newNormalized = normalizeWhitespace(stripComments(diff.newChunk!.body, grammar));
  return oldNormalized !== newNormalized;
}

export function filterMeaningfulChanges(diffs: ChunkDiff[]): ChunkDiff[] {
  return diffs.filter((diff) => {
    if (isTestFile(diff.filePath)) return false;
    const grammar = resolveGrammar(diff.filePath);
    if (!grammar) return false;
    return isMeaningfulChange(diff, grammar);
  });
}
