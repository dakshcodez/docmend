# @seal/cli

Self-healing technical documentation, as a local git hook. Detects when a code change makes your Markdown docs stale, auto-fixes high-confidence cases, and flags the rest for review — before you commit.

## Install

```console
$ npm install --save-dev @seal/cli
$ npx seal init      # installs a pre-commit hook
$ SEAL_GEMINI_API_KEY=... npx seal index   # one-time: build the code-to-docs graph
```

## Usage

`seal check` runs automatically on every commit via the installed hook. It diffs your staged changes, checks any linked docs for staleness, and rewrites + re-stages high-confidence fixes. Everything else is reported, never silently applied.

```console
$ npx seal check           # non-blocking by default
$ npx seal check --strict  # exit non-zero if anything needs review
$ SEAL_SKIP=1 git commit   # bypass the check entirely
```

Re-run `npx seal index` after significant changes to refresh the cached code-to-docs graph — it's read fresh on every `check`, not rebuilt automatically, which is what keeps the hook fast.

## Configuration

- `SEAL_GEMINI_API_KEY` (or `GEMINI_API_KEY`) — required.
- `.sealignore` in your repo root — gitignore-style syntax, excludes paths from the changed-file check.

Full documentation: [github.com/dakshcodez/seal](https://github.com/dakshcodez/seal)

## License

MIT
