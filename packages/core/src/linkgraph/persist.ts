import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LinkGraph } from './types.js';

export async function saveLinkGraph(graph: LinkGraph, filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(graph, null, 2), 'utf8');
}

export async function loadLinkGraph(filePath: string): Promise<LinkGraph> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as LinkGraph;
}
