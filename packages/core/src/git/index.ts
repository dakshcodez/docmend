export type { ChangedFile, ChangedFileStatus } from './types.js';
export { getDiffBetweenRefs, getStagedDiff } from './diff.js';
export { readFileAtRef, readStagedFile, readWorkingTreeFile } from './read-file.js';
export { stageFile } from './stage.js';
export { hasUnstagedChanges } from './status.js';
