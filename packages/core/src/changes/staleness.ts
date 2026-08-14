import type { LLMClient } from '../llm/index.js';
import type { StalenessVerdict, Suspect } from './types.js';

const SYSTEM_INSTRUCTION = `You are a technical documentation auditor. Given a code change and a documentation section that references the changed code, determine whether the documentation is still accurate.
Respond with ONLY a JSON object of the form {"stale": boolean, "explanation": string}. No markdown, no code fences, no extra text.
If the documentation is still accurate given the new code, set "stale" to false and "explanation" to a brief reason why it still holds.
If the documentation is inaccurate or outdated given the new code, set "stale" to true and "explanation" to a specific description of what is wrong.`;

function buildPrompt(suspect: Suspect): string {
  const { chunkDiff, section } = suspect;
  const oldCode = chunkDiff.oldChunk?.body ?? '(this code did not exist before the change)';
  const newCode = chunkDiff.newChunk?.body ?? '(this code was removed)';

  return [
    `Old code:\n\`\`\`\n${oldCode}\n\`\`\``,
    `New code:\n\`\`\`\n${newCode}\n\`\`\``,
    `Documentation section ("${section.headingPath.join(' > ')}"):\n${section.content}`,
  ].join('\n\n');
}

function parseVerdict(raw: string): { stale: boolean; explanation: string } {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  const parsed = JSON.parse(trimmed) as { stale: unknown; explanation: unknown };
  if (typeof parsed.stale !== 'boolean' || typeof parsed.explanation !== 'string') {
    throw new Error('LLM staleness response missing required fields');
  }
  return { stale: parsed.stale, explanation: parsed.explanation };
}

export async function verifyStaleness(suspect: Suspect, llm: LLMClient): Promise<StalenessVerdict> {
  const raw = await llm.complete(buildPrompt(suspect), {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0,
  });
  const { stale, explanation } = parseVerdict(raw);
  return { sectionId: suspect.section.id, chunkId: suspect.chunkDiff.chunkId, stale, explanation };
}

export async function verifyStalenessForAll(
  suspects: Suspect[],
  llm: LLMClient,
): Promise<StalenessVerdict[]> {
  const verdicts: StalenessVerdict[] = [];
  for (const suspect of suspects) {
    try {
      verdicts.push(await verifyStaleness(suspect, llm));
    } catch (error) {
      verdicts.push({
        sectionId: suspect.section.id,
        chunkId: suspect.chunkDiff.chunkId,
        stale: true,
        explanation: 'Automatic staleness verification failed; flagging for manual review.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return verdicts;
}
