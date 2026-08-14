import type { StalenessVerdict, Suspect } from '../changes/index.js';
import type { LLMClient } from '../llm/index.js';
import { parseJsonResponse } from '../llm/index.js';
import type { Correction, CorrectionMode } from './types.js';

const AUTO_FIX_THRESHOLD = 0.8;
const LOW_CONFIDENCE_MARKER = '<!-- seal: low-confidence correction, please review before merging -->\n';

const SYSTEM_INSTRUCTION = `You are a precise technical documentation editor. You will be given a documentation section, the new version of the code it describes, and a diagnosis of what is now inaccurate.
Rewrite ONLY the parts of the section that are inaccurate given the new code. Preserve the original style, tone, structure, and any content that is still accurate - do not rewrite parts that don't need to change.
Respond with ONLY a JSON object of the form {"correctedContent": string, "confidence": number, "rationale": string}. No markdown, no code fences, no extra text.
- "correctedContent": the full corrected section content, ready to replace the original.
- "confidence": a number from 0 to 1. Use HIGH confidence (0.8-1.0) only for simple, mechanical changes (renamed parameter, changed default value, updated type, updated URL). Use LOW confidence (below 0.5) for complex changes (new feature, removed capability, significant behavior change) where a human should verify the wording before merging.
- "rationale": a brief explanation of what was changed and why.`;

function buildPrompt(suspect: Suspect, verdict: StalenessVerdict): string {
  const { chunkDiff, section } = suspect;
  const newCode = chunkDiff.newChunk?.body ?? '(this code was removed)';

  return [
    `Documentation section ("${section.headingPath.join(' > ')}"):\n${section.content}`,
    `New code:\n\`\`\`\n${newCode}\n\`\`\``,
    `Staleness diagnosis: ${verdict.explanation}`,
  ].join('\n\n');
}

interface GenerationResponse {
  correctedContent: string;
  confidence: number;
  rationale: string;
}

function parseGenerationResponse(raw: string): GenerationResponse {
  const parsed = parseJsonResponse<Record<string, unknown>>(raw);
  if (
    typeof parsed.correctedContent !== 'string' ||
    typeof parsed.confidence !== 'number' ||
    typeof parsed.rationale !== 'string'
  ) {
    throw new Error('LLM correction response missing required fields');
  }
  if (!Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error(`LLM correction response has an out-of-range confidence: ${parsed.confidence}`);
  }
  return {
    correctedContent: parsed.correctedContent,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
  };
}

function resolveMode(correctedContent: string, confidence: number): { mode: CorrectionMode; content: string } {
  if (confidence >= AUTO_FIX_THRESHOLD) {
    return { mode: 'auto-fix', content: correctedContent };
  }
  const content = correctedContent.startsWith(LOW_CONFIDENCE_MARKER)
    ? correctedContent
    : `${LOW_CONFIDENCE_MARKER}${correctedContent}`;
  return { mode: 'review-needed', content };
}

export async function generateCorrection(
  suspect: Suspect,
  verdict: StalenessVerdict,
  llm: LLMClient,
): Promise<Correction> {
  const raw = await llm.complete(buildPrompt(suspect, verdict), {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.2,
  });
  const { correctedContent, confidence, rationale } = parseGenerationResponse(raw);
  const { mode, content } = resolveMode(correctedContent, confidence);

  return {
    sectionId: suspect.section.id,
    chunkId: suspect.chunkDiff.chunkId,
    originalContent: suspect.section.content,
    correctedContent: content,
    mode,
    confidence,
    rationale,
  };
}
