import type { StalenessVerdict, Suspect } from '../changes/index.js';
import type { LLMClient } from '../llm/index.js';
import { generateCorrection } from './generate.js';
import type { RepairResult } from './types.js';
import { validateCorrection } from './validate.js';

export async function repairSection(
  suspect: Suspect,
  verdict: StalenessVerdict,
  llm: LLMClient,
): Promise<RepairResult> {
  const correction = await generateCorrection(suspect, verdict, llm);
  const validation = await validateCorrection(correction, suspect, llm);
  return { sectionId: suspect.section.id, chunkId: suspect.chunkDiff.chunkId, correction, validation };
}

export async function repairStaleDocs(
  suspects: Suspect[],
  verdicts: StalenessVerdict[],
  llm: LLMClient,
): Promise<RepairResult[]> {
  const verdictsByKey = new Map(verdicts.map((verdict) => [`${verdict.chunkId}|${verdict.sectionId}`, verdict]));
  const results: RepairResult[] = [];

  for (const suspect of suspects) {
    const key = `${suspect.chunkDiff.chunkId}|${suspect.section.id}`;
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
