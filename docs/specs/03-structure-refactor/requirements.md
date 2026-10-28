# 03 Structure refactor — Requirements

| Id | Requirement | Acceptance criteria |
|---|---|---|
| R3.1 | Domain code SHALL live in feature folders `features/{editor,execution,share,auth,settings}`. | Files moved with `git mv`; no domain hook remains in `src/hooks`. |
| R3.2 | Only `src/lib/rpc` SHALL import `@connectrpc/*`. | grep check in a unit test (`architecture.test.ts`). |
| R3.3 | Feature hooks SHALL access the network only through `lib/rpc`. | Same test: no `fetch(` in `src/features`. |
| R3.4 | Domain types SHALL come from the generated contract; no hand-written duplicate of a contract message SHALL remain. | `lib/schemas`, `lib/types/result.ts`, `lib/api.ts` deleted. |
| R3.5 | Zod SHALL be used only for local storage and user-provided files. | `zod` imported only by `lib/zod.ts`; its users are the history and snippet stores and `lib/guards.ts` (architecture test). |
| R3.6 | Dead modules with no importer SHALL be removed or documented. | `web-vitals.ts`, gRPC, SSE removed; `LanguageToggle`, `useLocalStorage` kept and listed for the UI pass. |
| R3.7 | The page component SHALL compose features and not call RPC clients directly. | `page.tsx` imports no `lib/rpc` client. |
| R3.8 | Behaviour SHALL be preserved except where the contract removes it (execution mode setting). | Behaviour table in the design doc; unit tests for hooks pass. |
