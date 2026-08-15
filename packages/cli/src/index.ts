#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { buildIndex } from './commands/build-index.js';
import { check } from './commands/check.js';
import { init } from './commands/init.js';

const KNOWN_COMMANDS = new Set(['check', 'index', 'init']);

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  const explicitCommand = args[0] && KNOWN_COMMANDS.has(args[0]) ? args[0] : undefined;
  const command = explicitCommand ?? 'check';
  const rest = explicitCommand ? args.slice(1) : args;

  switch (command) {
    case 'init':
      return init(cwd);

    case 'index': {
      const apiKey = process.env.DOCMEND_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
      return buildIndex({ cwd, apiKey });
    }

    case 'check':
    default: {
      const { values } = parseArgs({
        args: rest,
        options: {
          base: { type: 'string' },
          strict: { type: 'boolean', default: false },
        },
        allowPositionals: false,
      });
      return check({ cwd, base: values.base, strict: values.strict ?? false });
    }
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('docmend: unexpected error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
