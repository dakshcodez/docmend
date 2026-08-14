export type { Correction, CorrectionMode, RepairResult, ValidationResult } from './types.js';
export { generateCorrection } from './generate.js';
export type { GenerateCorrectionOptions } from './generate.js';
export { validateCorrection } from './validate.js';
export { repairSection, repairStaleDocs } from './repair.js';
export { applyCorrectionToRepo } from './apply.js';
export type { ApplyCorrectionOutcome } from './apply.js';
