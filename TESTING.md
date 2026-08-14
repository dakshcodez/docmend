# Real-world accuracy test

This documents a real-world test of seal against a fork of [tj/commander.js](https://github.com/tj/commander.js) (a real, actively-maintained, well-documented JavaScript library — chosen over the originally-suggested FastAPI/Pydantic for its much smaller size, to keep the test's embedding-API cost and runtime tractable on a free-tier key).

## Methodology

1. Forked `tj/commander.js` to `dakshcodez/commander.js` and cloned it locally.
2. Ran `seal index` for real (live Gemini API, `gemini-3.7-flash`/`gemini-embedding-2` for indexing, `gemini-3.5-flash-lite` for the staleness/repair calls during this test session specifically to work around `3.7-flash`'s demand-driven `503`s — the shipped default remains `3.7-flash`). Indexed the full repo: **232 code chunks, 365 doc sections** (before the changelog-exclusion fix described below), producing 194 links (178 heuristic, 16 embedding).
3. Made three deliberate, targeted code changes and staged them, then ran `seal check` for real against the live pipeline.
4. Inspected the actual generated corrections and verdicts against expectations.

## Deliberate test cases

| # | Change | Expected | Actual result |
|---|---|---|---|
| 1 | Renamed `Command.prototype.name()` → `.setName()` in `lib/command.js` and `typings/index.d.ts` (breaking signature change, docs untouched) | Flag `Readme.md`'s `.name` section as stale | **Correctly flagged and auto-fixed** — `Readme.md#Commander.js > Automated help > .name` |
| 2 | Added an explanatory comment inside `.help()`'s body, no logic change | Not flagged | **Correctly not flagged** — filtered out before ever reaching the LLM (AST-based comment stripping) |
| 3 | Rewrote the internal, undocumented `_getCommandAndAncestors()` helper's loop style (`for` → `while`), same behavior, zero doc links | Not flagged | **Correctly produced zero suspects** — no doc section is linked to it at all |
| 4 (unplanned) | Same rename from #1 also touched a second, more ambiguous section (`Bits and pieces > Legacy options as properties`) referencing `.name()` in a way that was only partly affected | Ambiguous | The generation pass proposed a correction; the **validation pass caught that it was actually wrong** (the typings still exposed a valid `.name()` getter alongside the new `.setName()` setter) and downgraded it to "needs review" instead of auto-applying — the two-pass generate→validate design working exactly as intended |

## Bugs found and fixed as a direct result of this test

Live testing against a real repository surfaced three real bugs that no amount of mocked testing had caught:

1. **Indexing crashed outright** on a real repo: two locally-scoped test helper functions named `makeProgram` in different `describe()` blocks of the same test file produced identical chunk IDs, and Vectra's `insertItem` throws on a duplicate ID. Fixed two ways: test files are now excluded from code parsing entirely (they were never a useful doc-linking target anyway), and the embedding index now upserts rather than inserts, so any remaining ID collision degrades gracefully instead of crashing.
2. **No retry/backoff on rate limits.** The free tier's per-minute quotas (100 embed requests/min, 15 generate requests/min for `gemini-3.5-flash-lite`) were hit repeatedly during real indexing and staleness-checking, and every `429`/`503` was previously fatal. Added retry-with-exponential-backoff (up to 4 attempts) to `GeminiClient`.
3. **Changelog files were incorrectly treated as living documentation.** `CHANGELOG.md` entries describing historical releases (e.g. a 2020 entry for `.parseOption()`) got "corrected" to reflect current code state — rewriting history, not fixing stale docs. Fixed by excluding changelog-style files (`CHANGELOG.md`, `CHANGES.md`, `HISTORY.md`, `RELEASES.md`, case-insensitive) from doc parsing entirely, the same way test files are excluded from code parsing.

Also observed, not fixed: the correction pass occasionally touched unrelated formatting in the same file (removed a blank line after a few `### Added` headings in `CHANGELOG.md` before that file was excluded) despite being instructed to preserve untouched content — a minor prompt-adherence gap worth revisiting.

## Known limitations of this test

- The changelog-exclusion fix (bug #3 above) is verified at the unit level (the file-matching pattern was tested directly against 7 real-world filename cases, all correct) but **not re-validated end-to-end against the live API** — the free tier's *daily* embedding quota (1000 requests/day) was exhausted while re-indexing to confirm it, and daily quotas don't reset within a session. A full end-to-end re-run is a natural follow-up once quota is available.
- This test exercised the `@seal/cli` path (`seal index` + `seal check`) only, not the GitHub Action — the Action's `dist/index.js` isn't bundled for standalone execution yet (see the publish-phase task).
- One real repository, one language (JavaScript), a handful of deliberate cases — not a statistically rigorous accuracy benchmark, but real signal from real code and real docs rather than synthetic fixtures.
