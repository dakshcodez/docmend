import type { Node } from 'web-tree-sitter';
import type { GrammarId } from '../parsing/index.js';
import { createParser, resolveGrammar } from '../parsing/index.js';
import type { ChunkDiff } from './types.js';

const TEST_FILE_PATTERN = /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[^/]+$/;

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath);
}

function collectCommentRanges(node: Node, ranges: [number, number][]): void {
  if (node.type === 'comment') {
    ranges.push([node.startIndex, node.endIndex]);
    return;
  }
  for (const child of node.children) {
    if (child) collectCommentRanges(child, ranges);
  }
}

async function stripComments(source: string, grammar: GrammarId): Promise<string> {
  const parser = await createParser(grammar);
  const tree = parser.parse(source);
  if (!tree) {
    parser.delete();
    return source;
  }

  const ranges: [number, number][] = [];
  collectCommentRanges(tree.rootNode, ranges);
  ranges.sort((a, b) => b[0] - a[0]);

  let result = source;
  for (const [start, end] of ranges) {
    result = result.slice(0, start) + result.slice(end);
  }

  tree.delete();
  parser.delete();
  return result;
}

function normalizeWhitespace(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

export async function isMeaningfulChange(diff: ChunkDiff, grammar: GrammarId): Promise<boolean> {
  if (diff.changeType === 'unchanged') return false;
  if (diff.changeType === 'added' || diff.changeType === 'removed') return true;

  const [oldStripped, newStripped] = await Promise.all([
    stripComments(diff.oldChunk!.body, grammar),
    stripComments(diff.newChunk!.body, grammar),
  ]);

  return normalizeWhitespace(oldStripped) !== normalizeWhitespace(newStripped);
}

export async function filterMeaningfulChanges(diffs: ChunkDiff[]): Promise<ChunkDiff[]> {
  const results = await Promise.all(
    diffs.map(async (diff) => {
      if (isTestFile(diff.filePath)) return null;
      const grammar = resolveGrammar(diff.filePath);
      if (!grammar) return null;
      const meaningful = await isMeaningfulChange(diff, grammar);
      return meaningful ? diff : null;
    }),
  );
  return results.filter((diff): diff is ChunkDiff => diff !== null);
}
