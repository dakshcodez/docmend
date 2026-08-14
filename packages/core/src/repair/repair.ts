import type { StalenessVerdict, Suspect } from '../changes/index.js';
import type { LLMClient } from '../llm/index.js';
import { compositeKey } from '../shared/composite-key.js';
import { generateCorrection } from './generate.js';
import type { RepairResult } from './types.js';
import { validateCorrection } from './validate.js';

export async function repairSection(
  suspect: Suspect,
  verdict: StalenessVerdict,
  llm: LLMClient,
): Promise<RepairResult> {
  const sectionId = suspect.section.id;
  const chunkId = suspect.chunkDiff.chunkId;

  // Validation failure is handled separately from generation failure so a
  // successfully-generated correction is never discarded just because the
  // follow-up validation call failed.
  const correction = await generateCorrection(suspect, verdict, llm);

  try {
    const validation = await validateCorrection(correction, suspect, llm);
    return { sectionId, chunkId, correction, validation };
  } catch (error) {
    return {
      sectionId,
      chunkId,
      correction,
      validation: null,
      error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function repairStaleDocs(
  suspects: Suspect[],
  verdicts: StalenessVerdict[],
  llm: LLMClient,
): Promise<RepairResult[]> {
  const verdictsByKey = new Map(
    verdicts.map((verdict) => [compositeKey(verdict.chunkId, verdict.sectionId), verdict]),
  );
  const results: RepairResult[] = [];

  for (const suspect of suspects) {
    const key = compositeKey(suspect.chunkDiff.chunkId, suspect.section.id);
    const verdict = verdictsByKey.get(key);
    if (!verdict?.stale) continue;

    try {
      results.push(await repairSection(suspect, verdict, llm));
    } catch (error) {
      results.push({
        sectionId: suspect.section.id,
        chunkId: suspect.chunkDiff.chunkId,
        correction: null,
        validation: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
