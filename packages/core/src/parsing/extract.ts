import type { Node } from 'web-tree-sitter';
import { Query } from 'web-tree-sitter';
import { createParser } from './grammar-loader.js';
import { JS_FAMILY_QUERY, PYTHON_QUERY } from './queries.js';
import type { ChunkKind, CodeChunk, GrammarId, SupportedLanguage } from './types.js';

function isMethodInClass(node: Node): boolean {
  let current = node.parent;
  while (current) {
    if (current.type === 'class_definition') return true;
    if (current.type === 'function_definition') return false;
    current = current.parent;
  }
  return false;
}

function resolveKind(declNode: Node, grammar: GrammarId): ChunkKind {
  if (declNode.type === 'class_declaration' || declNode.type === 'class_definition') {
    return 'class';
  }
  if (declNode.type === 'method_definition') {
    return 'method';
  }
  if (grammar === 'python' && isMethodInClass(declNode)) {
    return 'method';
  }
  return 'function';
}

function findEnclosingClassName(node: Node, classNodeType: string): string | null {
  let current = node.parent;
  while (current) {
    if (current.type === classNodeType) {
      const nameNode = current.childForFieldName('name');
      return nameNode ? nameNode.text : null;
    }
    current = current.parent;
  }
  return null;
}

function getChunkContainer(declNode: Node): Node {
  let container = declNode;

  // `const foo = () => {}` captures the `variable_declarator`, but the
  // declaration keyword (and any `export`) lives one or two levels up.
  const parent = container.parent;
  if (parent && (parent.type === 'lexical_declaration' || parent.type === 'variable_declaration')) {
    container = parent;
  }

  const grandparent = container.parent;
  if (grandparent && grandparent.type === 'export_statement') {
    container = grandparent;
  }

  return container;
}

function extractSignature(container: Node): string {
  const text = container.text;
  const newlineIndex = text.indexOf('\n');
  const firstLine = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  return firstLine.trim();
}

function extractDocComment(declNode: Node, container: Node, grammar: GrammarId): string | null {
  if (grammar === 'python') {
    const body = declNode.childForFieldName('body');
    const first = body?.namedChildren[0];
    if (first?.type === 'expression_statement') {
      const expr = first.namedChildren[0];
      if (expr?.type === 'string') {
        return expr.text;
      }
    }
    return null;
  }

  const sibling = container.previousNamedSibling;
  if (sibling?.type === 'comment' && sibling.text.startsWith('/**')) {
    return sibling.text;
  }
  return null;
}

export async function extractChunksFromSource(
  source: string,
  filePath: string,
  grammar: GrammarId,
): Promise<CodeChunk[]> {
  const parser = await createParser(grammar);
  const tree = parser.parse(source);
  if (!tree) {
    parser.delete();
    return [];
  }

  const language: SupportedLanguage = grammar === 'tsx' ? 'typescript' : grammar;
  const queryString = grammar === 'python' ? PYTHON_QUERY : JS_FAMILY_QUERY;
  const classNodeType = grammar === 'python' ? 'class_definition' : 'class_declaration';
  const query = new Query(tree.language, queryString);
  const captures = query.captures(tree.rootNode);

  const chunks: CodeChunk[] = [];
  for (const capture of captures) {
    if (capture.name !== 'chunk') continue;
    const declNode = capture.node;
    const nameNode = declNode.childForFieldName('name');
    if (!nameNode) continue;

    const kind = resolveKind(declNode, grammar);
    const className = kind === 'method' ? findEnclosingClassName(declNode, classNodeType) : null;
    const symbolPath = className ? `${className}.${nameNode.text}` : nameNode.text;
    const container = getChunkContainer(declNode);

    chunks.push({
      id: `${filePath}#${symbolPath}`,
      filePath,
      language,
      kind,
      name: nameNode.text,
      signature: extractSignature(container),
      body: container.text,
      docComment: extractDocComment(declNode, container, grammar),
      startLine: container.startPosition.row + 1,
      endLine: container.endPosition.row + 1,
    });
  }

  query.delete();
  tree.delete();
  parser.delete();
  return chunks;
}
