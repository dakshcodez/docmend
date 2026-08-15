# seal

**Self-healing technical documentation.** seal watches your codebase, detects when a code change makes your docs inaccurate, and either fixes the stale section automatically or flags it for human review — as a local git hook, a GitHub Action, or both.

Every team's docs drift out of sync with the code. seal closes that gap automatically, using an LLM to understand *what* changed and whether it actually invalidates what's written about it — not just that a file touched a function that happens to be mentioned somewhere.

## How it works

1. **Parse** your codebase (TypeScript, TSX, JavaScript, Python) into semantic chunks — functions, classes, methods — and your Markdown docs into heading-based sections.
2. **Link** each doc section to the code it describes, using both heuristic name-matching and embedding similarity.
3. **Detect** meaningful code changes on a diff (skipping comment/whitespace-only edits and test files), and ask an LLM whether each linked doc section is still accurate.
4. **Repair** confirmed-stale sections: a first LLM pass proposes a targeted correction, a second pass validates it. High-confidence, validated corrections get auto-fixed; everything else is flagged for a human.

## Installing

### As a local git hook (`@seal/cli`)

```console
$ npm install --save-dev @seal/cli
$ npx seal init      # installs a pre-commit hook
$ SEAL_GEMINI_API_KEY=... npx seal index   # one-time: build the code-to-docs graph
```

From then on, `seal check` runs automatically on every commit: it diffs your staged changes, checks any linked docs for staleness, and — for high-confidence fixes — rewrites the doc and re-stages it alongside your change. Anything uncertain is reported, never silently applied.

- Non-blocking by default. Pass `--strict` to block the commit when something needs review.
- `SEAL_SKIP=1 git commit ...` bypasses the check entirely.
- Re-run `seal index` after significant changes to refresh the cached graph (it's read fresh; nothing rebuilds automatically on every commit — that's what keeps the hook fast).
- `.sealignore` (gitignore-style syntax) excludes paths from the *changed-file* check.

### As a GitHub Action (`@seal/action`)

```yaml
# .github/workflows/seal.yml
on:
  pull_request:

permissions:
  contents: write
  pull-requests: write

jobs:
  seal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # need the PR's base commit available, not just the head
      - uses: dakshcodez/seal@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          # confidence-threshold: '0.8'   # optional, default shown
          # auto-merge: 'false'           # optional, default shown
```

On every PR, the Action diffs the base against the head commit, and for validated high-confidence fixes opens a PR back into your branch (so the fix rides along when you merge). Everything else — needs-review items, failures, a summary — is posted as one comment on the PR.

## Configuration

Both the CLI and the Action read the same underlying pipeline. The CLI takes `SEAL_GEMINI_API_KEY` (or `GEMINI_API_KEY`) from the environment; the Action takes `gemini-api-key` as an input, matching the `action.yml` inputs (`confidence-threshold`, `auto-merge`, `github-token`).

## Real-world accuracy

Tested end-to-end against a real, live-forked project (not synthetic fixtures) — see [`TESTING.md`](./TESTING.md) for full methodology and results. Summary: correctly caught and auto-fixed a real breaking API rename; correctly ignored a comment-only change and an undocumented internal refactor; and its two-pass generate-then-validate design caught and downgraded a flawed initial correction on a genuinely ambiguous real case, instead of wrongly auto-applying it.

## Tech stack

TypeScript throughout, npm workspaces monorepo. Gemini (`gemini-3.7-flash` / `gemini-embedding-2`) behind a provider-agnostic `LLMClient` interface. Vectra for local vector storage (embedded, no server). `web-tree-sitter` (WASM) for code parsing, chosen over native tree-sitter bindings and Docker-based tooling to keep both the npm install and the Action's cold start fast and dependency-free.

## Project structure

```
packages/
  core/    @seal/core   - shared pipeline: parsing, link graph, change detection, doc repair
  cli/     @seal/cli    - npm package, the local git hook
  action/  @seal/action - GitHub Action
```

## License

[MIT](./LICENSE)
