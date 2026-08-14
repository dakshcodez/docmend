import { extractChunksFromSource, resolveGrammar } from '../parsing/index.js';
import type { ChunkDiff, FileChange } from './types.js';

export async function diffFileChunks(change: FileChange): Promise<ChunkDiff[]> {
  const grammar = resolveGrammar(change.filePath);
  if (!grammar) return [];

  const oldChunks =
    change.oldContent !== null
      ? await extractChunksFromSource(change.oldContent, change.filePath, grammar)
      : [];
  const newChunks =
    change.newContent !== null
      ? await extractChunksFromSource(change.newContent, change.filePath, grammar)
      : [];

  const oldById = new Map(oldChunks.map((chunk) => [chunk.id, chunk]));
  const newById = new Map(newChunks.map((chunk) => [chunk.id, chunk]));
  const allIds = new Set([...oldById.keys(), ...newById.keys()]);

  const diffs: ChunkDiff[] = [];
  for (const id of allIds) {
    const oldChunk = oldById.get(id) ?? null;
    const newChunk = newById.get(id) ?? null;

    let changeType: ChunkDiff['changeType'];
    if (!oldChunk) {
      changeType = 'added';
    } else if (!newChunk) {
      changeType = 'removed';
    } else if (oldChunk.body !== newChunk.body) {
      changeType = 'modified';
    } else {
      changeType = 'unchanged';
    }

    diffs.push({ chunkId: id, filePath: change.filePath, changeType, oldChunk, newChunk });
  }

  return diffs;
}

export async function diffChunks(changes: FileChange[]): Promise<ChunkDiff[]> {
  const results = await Promise.all(changes.map(diffFileChunks));
  return results.flat();
}
