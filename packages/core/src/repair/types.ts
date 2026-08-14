export type CorrectionMode = 'auto-fix' | 'review-needed';

export interface Correction {
  sectionId: string;
  chunkId: string;
  originalContent: string;
  correctedContent: string;
  mode: CorrectionMode;
  confidence: number;
  rationale: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface RepairResult {
  sectionId: string;
  chunkId: string;
  correction: Correction | null;
  validation: ValidationResult | null;
  error?: string;
}
