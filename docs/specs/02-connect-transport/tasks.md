# 02 Connect transport — Tasks

| # | Task | Req | Status |
|---|---|---|---|
| T2.1 | Install proto package from tarball, connect-es v2, protobuf-es v2, protovalidate | R2.1 | done |
| T2.2 | Tests: `errors.test.ts` (written right after the first draft of `errors.ts`, not before) (reason/code mapping, retry_after, network failure) | R2.9 | done |
| T2.3 | Implement `errors.ts` | R2.9 | done |
| T2.4 | Tests: `validate.test.ts` (path traversal, total size) | R2.8 | done |
| T2.5 | Implement `validate.ts` | R2.8 | done |
| T2.6 | Tests first: `run-stream.test.ts` (incremental output, UTF-8 split, seq gaps, abort, reconnect, cancel during poll) | R2.2–R2.7 | done |
| T2.7 | Implement `run-stream.ts`, `transport.ts`, `clients.ts`, `context.tsx` | R2.1–R2.7 | done |
| T2.8 | Transport header test (binary, protocol version, credentials) | R2.1 | done |
| T2.9 | Port hooks: languages, execution, share, settings, auth, templates, format | R2.2, R2.8 | done |
| T2.10 | Delete axios/grpc/websocket/sse/csrf/schemas/api-client/mocks/`proto/`/`scripts/generate-proto.sh` | R2.1, R2.11, R2.12 | done |
| T2.11 | Backend-absent browser smoke | R2.10 | done |
