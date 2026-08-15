import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SPECIAL_CHARS = '.+^${}()|[]\\';

function globToRegExp(pattern: string): RegExp {
  const anchored = pattern.startsWith('/');
  const body = anchored ? pattern.slice(1) : pattern;

  let regexSource = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '*' && body[i + 1] === '*' && body[i + 2] === '/') {
      regexSource += '(?:.*/)?';
      i += 3;
    } else if (body[i] === '*' && body[i + 1] === '*') {
      regexSource += '.*';
      i += 2;
    } else if (body[i] === '*') {
      regexSource += '[^/]*';
      i += 1;
    } else if (body[i] === '?') {
      regexSource += '.';
      i += 1;
    } else if (SPECIAL_CHARS.includes(body[i])) {
      regexSource += `\\${body[i]}`;
      i += 1;
    } else {
      regexSource += body[i];
      i += 1;
    }
  }

  const isAnchored = anchored || body.includes('/');
  const source = isAnchored ? `^${regexSource}` : `(^|/)${regexSource}`;
  return new RegExp(`${source}(/|$)`);
}

export async function loadIgnorePatterns(rootDir: string): Promise<RegExp[]> {
  let raw: string;
  try {
    raw = await readFile(join(rootDir, '.docmendignore'), 'utf8');
  } catch {
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(globToRegExp);
}

export function isIgnored(relativePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(relativePath));
}
