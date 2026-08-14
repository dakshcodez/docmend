import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applySectionCorrection, parseMarkdownSections } from '../docs/index.js';
import { hasUnstagedChanges, stageFile } from '../git/index.js';
import type { LinkGraph } from '../linkgraph/index.js';

export type ApplyCorrectionOutcome = 'applied' | 'skipped-not-found' | 'skipped-partial-stage';

export async function applyCorrectionToRepo(
  cwd: string,
  graph: LinkGraph,
  sectionId: string,
  correctedContent: string,
): Promise<ApplyCorrectionOutcome> {
  const linkedSection = graph.sections.find((section) => section.id === sectionId);
  if (!linkedSection) return 'skipped-not-found';

  // Only touch a file that's already clean, so staging it can never pull in
  // unrelated changes that happened to already be sitting in the same file.
  if (await hasUnstagedChanges(cwd, linkedSection.filePath)) {
    return 'skipped-partial-stage';
  }

  const absolutePath = join(cwd, linkedSection.filePath);
  const currentMarkdown = await readFile(absolutePath, 'utf8');
  const freshSection = parseMarkdownSections(currentMarkdown, linkedSection.filePath).find(
    (section) => section.id === sectionId,
  );
  if (!freshSection) return 'skipped-not-found';

  await applySectionCorrection(absolutePath, freshSection, correctedContent);
  await stageFile(cwd, linkedSection.filePath);
  return 'applied';
}
