const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`([^`\n]+)`/g;

export function extractCodeReferences(content: string): string[] {
  const withoutFencedBlocks = content.replace(FENCED_CODE_BLOCK_PATTERN, '');
  const references = new Set<string>();
  for (const match of withoutFencedBlocks.matchAll(INLINE_CODE_PATTERN)) {
    const text = match[1].trim();
    if (text) {
      references.add(text);
    }
  }
  return [...references];
}
