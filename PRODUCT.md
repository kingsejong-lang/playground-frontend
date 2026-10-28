# Product

<!-- impeccable:product-schema 1 -->

> Written without a live interview: the owner was unavailable, so every fact below is derived from
> `README.md`, `docs/refactoring/REFACTORING_DESIGN.md`, `docs/specs/*`, the `playground-proto`
> contract and the code. Lines marked **(inferred)** are assumptions to confirm.

## Platform

web

## Users

- **Korean learners of programming** who want to write their first programs with Korean keywords
  (`출력`, `반복`, `함수`) in KingSejong without installing anything. They read Korean first; English
  UI is a fallback. **(inferred from the default locale `ko`, the KingSejong-first language order and
  the Korean starter code)**
- **Developers and teachers** who try KingSejong, Python 3.12 or Go 1.22 snippets, compare output,
  and share a link or embed a runnable snippet in a document or lesson page.
- Visitors arriving through a **shared link** (`/{locale}?share={id}`) or an **embedded snippet**
  (`/{locale}/embed/{id}` inside a third-party page).

## Product Purpose

KingSejong Playground is an online IDE: write a program, run it in a sandbox on the server, read
the streamed output, and share it. Success is a first run within seconds of landing, output that
explains failures (compile diagnostics with positions, time/memory/output limits), and a share or
embed link that runs the same program elsewhere.

## Positioning

The reference playground for **KingSejong (`.ksj`)**, a programming language with Korean keywords.
Python and Go run beside it so learners can compare. No neighbouring playground offers KingSejong
syntax highlighting, its formatter (`kingsejong fmt` through `FormatCode`) and Korean diagnostics.

## Operating Context

- Desktop browsers at a desk (lesson, self-study) and phones opening a shared link. **(inferred)**
- One public backend edge speaking the Connect protocol (binary protobuf, cookie sessions). The UI
  must stay usable when the backend is down: the page renders and states that the server is
  unavailable.
- Runs stream events: Accepted, Queued (position), Started (compile/run phase), Output
  (stdout/stderr), Diagnostic (file:line:column), Truncated, Heartbeat, Finished (status, exit
  code, metrics). Terminal statuses: succeeded, failed, compile error, time/memory/output limit
  exceeded, cancelled, internal error.
- Anonymous use is the default; signing in only syncs editor settings.

## Capabilities and Constraints

- Languages, templates (`Language.default_template_id`, falling back to `hello_world`), formatting,
  execution, shares and settings come from `playground.api.v1` (`@kingsejong-lang/playground-proto`).
- Limits per language are published (`ExecutionLimits`): wall/CPU time, memory, output bytes,
  concurrency, runs per minute. Total source is capped (`MAX_TOTAL_SOURCE_BYTES`).
- Only `src/lib/rpc` talks to the network; a strict per-request CSP (nonce + `strict-dynamic`) is
  enforced, so no inline scripts or HTML injection sinks.
- A run (and a share) sends every open file and starts from the entry file: the user's choice, else
  the language's `default_entry_file` when present, else the first file. Work is kept as a local
  draft per language (Mod+S, or auto-save when enabled); nothing is sent for drafts.
- Locales: `ko` (default) and `en` via next-intl.
- Undecided: account features beyond settings sync; share expiry and deletion UI. **(inferred)**

## Brand Commitments

- Name: **킹세종 Playground** / KingSejong Playground.
- Existing identity "Code Sanctuary": Korean dancheong accents on a terminal-like dark surface,
  dark theme by default plus a light theme. This pass is a refinement and keeps it.
- Voice: plain, friendly, instructive Korean (해요체) for learners; concise English. **(inferred)**

## Evidence on Hand

- Starter programs and templates come from the server; the fake backend (`NEXT_PUBLIC_RPC_FAKE=1`,
  development only) supplies realistic samples for UI work.
- No logo artwork beyond `src/app/icon.svg`; no testimonials, user counts or benchmarks exist and
  none may be invented.

## Product Principles

1. **First run in one keystroke.** A new visitor sees runnable code and an obvious Run control.
2. **Failures teach.** Every non-success status says what happened, where (file:line) and what to try.
3. **Korean first, not translated.** Korean copy is written for Korean readers; English is its peer.
4. **Degrade honestly.** Backend down, rate limited or overloaded states are explicit and recoverable.
5. **Shareable means runnable.** A share link or embed reproduces the program and runs it.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes (the README claims WCAG AA conformance): keyboard-complete operation,
visible focus, 24 px minimum targets, reduced-motion support, screen-reader status announcements
for runs, layouts down to 360 px wide.
