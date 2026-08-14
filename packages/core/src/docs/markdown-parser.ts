import { extractCodeReferences } from './code-references.js';
import type { DocSection } from './types.js';

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE_PATTERN = /^```/;

interface HeadingLine {
  level: number;
  text: string;
  lineIndex: number;
}

function findHeadings(lines: string[]): HeadingLine[] {
  const headings: HeadingLine[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE_PATTERN.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = HEADING_PATTERN.exec(line);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), lineIndex: i });
    }
  }
  return headings;
}

export function parseMarkdownSections(markdown: string, filePath: string): DocSection[] {
  const lines = markdown.split('\n');
  const headings = findHeadings(lines);
  const sections: DocSection[] = [];
  const stack: HeadingLine[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    const headingPath = [...stack.map((h) => h.text), heading.text];
    stack.push(heading);

    const nextLineIndex = headings[i + 1]?.lineIndex ?? lines.length;
    const content = lines.slice(heading.lineIndex + 1, nextLineIndex).join('\n').trim();

    sections.push({
      id: `${filePath}#${headingPath.join(' > ')}`,
      filePath,
      headingPath,
      level: heading.level,
      content,
      codeReferences: extractCodeReferences(content),
      startLine: heading.lineIndex + 1,
      endLine: nextLineIndex,
    });
  }

  return sections;
}
