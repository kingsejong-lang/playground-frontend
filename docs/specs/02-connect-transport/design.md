# 02 Connect transport — Design

## Modules (`src/lib/rpc/`)

* `transport.ts` — `createApiTransport(baseUrl = NEXT_PUBLIC_API_URL)`:
  `createConnectTransport({ baseUrl, useBinaryFormat: true, fetch: (i, init) => fetch(i, {...init, credentials: "include"}), defaultTimeoutMs: 15000 })`.
  `Run` passes `timeoutMs: 0`-equivalent by setting its own `signal` only.
* `clients.ts` — `createApiClients(transport)` returns `{ language, execution, share, settings, auth }`.
* `context.tsx` — `RpcProvider` / `useRpc()`; default value is a lazily created singleton for the
  browser so hooks work without a provider; tests wrap with a provider holding a router transport.
* `errors.ts` — `RpcFailure { kind, message, code?, reason?, field?, retryAfterSeconds? }`,
  `toRpcFailure(unknown)`, `RpcFailureError` (thrown by validation). Kinds: `validation`,
  `unauthenticated`, `forbidden`, `not_found`, `rate_limited`, `concurrency_limit`, `overloaded`,
  `payload_too_large`, `language_unavailable`, `unavailable`, `cancelled`, `internal`.
  Messages are English (as the previous hook strings); i18n is a UI-pass item.
* `validate.ts` — single `createValidator()` instance; `assertValid(schema, message)` throws
  `RpcFailureError(kind: validation, field)`; `assertFilesFit(files)` uses `checkTotalSource`.
* `run-stream.ts` — `RunAccumulator` (folds `RunEvent`s: per-stream `TextDecoder`, seq gaps,
  duplicates ignored) and `runSession({ client, request, signal, onUpdate, sleep })` which drives
  the stream (`timeoutMs: 0`, so the 15 s unary default does not cut long runs), handles reconnect
  via `GetExecution` (backoff 1/2/4/8/8 s) and returns the final `ExecutionResult`.
  `useCodeExecution` coalesces `onUpdate` to one React update per animation frame.

## `ExecutionResult` view model (`lib/rpc/run-stream.ts`)

Kept next to the reducer that produces it so `lib/rpc` never imports from `features/`.

`{ executionId?, status: ExecutionStatus, success, exitCode?, chunks: {stream, text}[] (adjacent
same-stream chunks merged), diagnostics: Diagnostic[], truncated: {stream, droppedBytes}[], metrics?,
message?, gaps, reconnected, phase?, queuePosition? }`. Serialisable to JSON for history (bigints
converted to numbers).

## Sequence (happy path)

`useCodeExecution.execute()` → validate → `AbortController` → `runSession` → `for await` events →
`applyRunEvent` → `onUpdate(state)` (batched per event) → `Finished` → `finalizeRunState` flushes
decoders → history entry.

## Failure handling

* Error before `Accepted` → `toRpcFailure` → `error` string in the output panel.
* Error after `Accepted`, code in {Unavailable, Unknown, DeadlineExceeded, Internal(network)} →
  reconnect poll; non-terminal status after retries → result with message "Lost connection; final
  status unknown".
* `AbortError`/`Canceled` caused by our own signal → status `cancelled`, no error. `reset()`
  (Ctrl+K) detaches the run before aborting so the cancelled result is not shown.
