import type { Suspect } from '../changes/index.js';
import type { LLMClient } from '../llm/index.js';
import { parseJsonResponse } from '../llm/index.js';
import type { Correction, ValidationResult } from './types.js';

const SYSTEM_INSTRUCTION = `You are a meticulous technical documentation quality checker. You will be given the new code, the original documentation section, and a proposed corrected version.
Check three things: (1) does the corrected content accurately describe the new code, (2) did it preserve the parts of the original that were already correct without unnecessary rewrites, (3) is the writing style and tone consistent with the original.
Respond with ONLY a JSON object of the form {"valid": boolean, "issues": string[]}. No markdown, no code fences, no extra text.
"valid" is true only if all three checks pass. "issues" lists specific problems found; use an empty array if valid.`;

function buildPrompt(correction: Correction, suspect: Suspect): string {
  const newCode = suspect.chunkDiff.newChunk?.body ?? '(this code was removed)';

  return [
    `New code:\n\`\`\`\n${newCode}\n\`\`\``,
    `Original documentation section:\n${correction.originalContent}`,
    `Proposed corrected section:\n${correction.correctedContent}`,
  ].join('\n\n');
}

function parseValidationResponse(raw: string): ValidationResult {
  const parsed = parseJsonResponse<Record<string, unknown>>(raw);
  if (typeof parsed.valid !== 'boolean' || !Array.isArray(parsed.issues)) {
    throw new Error('LLM validation response missing required fields');
  }
  return { valid: parsed.valid, issues: parsed.issues.map(String) };
}

export async function validateCorrection(
  correction: Correction,
  suspect: Suspect,
  llm: LLMClient,
): Promise<ValidationResult> {
  const raw = await llm.complete(buildPrompt(correction, suspect), {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0,
  });
  return parseValidationResponse(raw);
}
