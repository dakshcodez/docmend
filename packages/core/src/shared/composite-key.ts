export function compositeKey(...parts: string[]): string {
  return JSON.stringify(parts);
}
