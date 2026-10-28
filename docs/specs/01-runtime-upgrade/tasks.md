# 01 Runtime upgrade — Tasks

| # | Task | Req | Status |
|---|---|---|---|
| T1.1 | Add `.nvmrc`, `engines`, `packageManager` | R1.1 | done |
| T1.2 | Rewrite `package.json` with pinned versions; remove axios, grpc-web, google-protobuf, ts-protoc-gen, grpc-tools, msw, whatwg-fetch, next-pwa, web-vitals, jest stack | R1.2, R1.9 | done |
| T1.3 | Run `@tailwindcss/upgrade` and review diff | R1.7 | done |
| T1.4 | Run `next-async-request-api` codemod; port `middleware.ts` to `proxy.ts` by hand | R1.3, R1.4 | done |
| T1.5 | Migrate next-intl config to v4 (`routing.ts`, `request.ts`) | R1.3 | done |
| T1.6 | `next.config.ts` without removed keys; drop PWA | R1.9, R1.11 | done |
| T1.7 | ESLint flat config, `lint` script uses ESLint CLI | R1.5 | done |
| T1.8 | Vitest config + port tests | R1.8 | done |
| T1.9 | `overrides.dompurify`; `npm audit` (full and `--omit=dev`) = 0 | R1.10 | done |
| T1.10 | Verify build/lint/typecheck/test | R1.2–R1.8 | done (lint: 0 errors, 17 warnings) |
| T1.11 | `@vitest/coverage-v8`; old 70 % Jest threshold not carried over (overall coverage 34 %, `lib/rpc` 81 %) | R1.8 | done, threshold open |
