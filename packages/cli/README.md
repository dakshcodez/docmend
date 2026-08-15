# @docmend/cli

Automated documentation healing, as a local git hook. Detects when a code change makes your Markdown docs stale, auto-fixes high-confidence cases, and flags the rest for review — before you commit.

## Install

```console
$ npm install --save-dev @docmend/cli
$ npx docmend init      # installs a pre-commit hook
$ DOCMEND_GEMINI_API_KEY=... npx docmend index   # one-time: build the code-to-docs graph
```

## Usage

`docmend check` runs automatically on every commit via the installed hook. It diffs your staged changes, checks any linked docs for staleness, and rewrites + re-stages high-confidence fixes. Everything else is reported, never silently applied.

```console
$ npx docmend check           # non-blocking by default
$ npx docmend check --strict  # exit non-zero if anything needs review
$ DOCMEND_SKIP=1 git commit   # bypass the check entirely
```

Re-run `npx docmend index` after significant changes to refresh the cached code-to-docs graph — it's read fresh on every `check`, not rebuilt automatically, which is what keeps the hook fast.

## Configuration

- `DOCMEND_GEMINI_API_KEY` (or `GEMINI_API_KEY`) — required.
- `.docmendignore` in your repo root — gitignore-style syntax, excludes paths from the changed-file check.

Full documentation: [github.com/dakshcodez/docmend](https://github.com/dakshcodez/docmend)

## License

MIT
