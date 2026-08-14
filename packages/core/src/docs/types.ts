export interface DocSection {
  id: string;
  filePath: string;
  headingPath: string[];
  level: number;
  content: string;
  codeReferences: string[];
  startLine: number;
  endLine: number;
}
