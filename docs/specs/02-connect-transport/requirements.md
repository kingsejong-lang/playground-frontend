# 02 Connect transport — Requirements

| Id | Requirement | Acceptance criteria |
|---|---|---|
| R2.1 | The browser SHALL talk to the backend only through Connect clients generated from `@kingsejong-lang/playground-proto`, using the binary codec and `credentials: "include"`. | No `axios`, `WebSocket`, `EventSource`, `grpc-web` import in `src/`; transport test asserts `content-type: application/proto` and `connect-protocol-version: 1`. |
| R2.2 | WHEN the user runs code, the system SHALL call `ExecutionService.Run` and render events incrementally. | Unit test: stdout chunks appear before `Finished`. |
| R2.3 | The system SHALL decode `Output.data` with one streaming UTF-8 decoder per stream. | Unit test: a Hangul character split across two chunks renders once, correctly; stdout and stderr decoders are independent. |
| R2.4 | IF an event's `seq` is not previous `seq + 1`, THEN the system SHALL count the gap and show that output may be incomplete. | Unit test with seq 1,2,5 → `gaps = 2`. |
| R2.5 | WHEN the user cancels (or a new run starts, or the component unmounts) WHILE a run stream is open, the system SHALL abort the fetch via `AbortSignal`. | Unit test: the server-side handler observes `signal.aborted`; result status is `CANCELLED` locally. |
| R2.6 | IF the stream fails after `Accepted` with a transient code, THEN the system SHALL reconnect by polling `GetExecution` until a terminal status (bounded retries) and mark the result as reconnected. | Unit test: stream errors with `Unavailable` after output; `GetExecution` returns `SUCCEEDED`; final result succeeded and `reconnected = true`. |
| R2.7 | WHEN the user cancels WHILE only reconnect polling is active, the system SHALL call `ExecutionService.Cancel`. | Unit test: Cancel called with the execution id. |
| R2.8 | Before sending `Run`, `CreateShare`, `FormatCode`, `UpdateSettings`, `Login`, `Register`, the system SHALL validate the message with protovalidate and, for file sets, `checkTotalSource`. | Unit test: path `../x` and >256 KiB total are rejected without any network call. |
| R2.9 | IF an RPC fails, THEN the system SHALL map Connect code and `ErrorDetail.reason` to a safe UI message, including `retry_after_seconds` when present. | Unit test per reason (VALIDATION with field, RATE_LIMITED with retry, CONCURRENCY_LIMIT, OVERLOADED, NOT_FOUND, UNAUTHENTICATED, network failure). |
| R2.10 | IF the backend is unreachable, THEN the page SHALL render with a "server unavailable" message and no application-level `console.error`. | Browser smoke with backend absent. |
| R2.11 | Tests SHALL use `createRouterTransport` fakes instead of HTTP mocks. | `msw` absent; tests import `createRouterTransport`. |
| R2.12 | The system SHALL not use a CSRF token endpoint or a token stored in JS-accessible storage. | grep: no `csrf`, no `localStorage` access to tokens. |
