export type SupportedLanguage = 'typescript' | 'javascript' | 'python';

export type GrammarId = 'typescript' | 'tsx' | 'javascript' | 'python';

export type ChunkKind = 'function' | 'class' | 'method';

export interface CodeChunk {
  id: string;
  filePath: string;
  language: SupportedLanguage;
  kind: ChunkKind;
  name: string;
  signature: string;
  body: string;
  docComment: string | null;
  startLine: number;
  endLine: number;
}
