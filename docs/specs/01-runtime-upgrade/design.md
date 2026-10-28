# 01 Runtime upgrade — Design

* Versions are pinned exactly (no `^`) for runtime and tooling so `npm ci` is reproducible;
  `dompurify` is forced to `3.4.17` via `overrides` because `monaco-editor@0.57.0` (peer of
  `@monaco-editor/react`) pins a vulnerable `3.4.15`.
* `next.config.ts` (typed) replaces `next.config.js`; plugins: `next-intl/plugin`
  (`./src/i18n/request.ts`) and `@next/bundle-analyzer` (only with `ANALYZE=true`, which uses
  `next build --webpack` because the analyzer is a webpack plugin).
* next-intl 4: `src/i18n/routing.ts` (`defineRouting`), `src/i18n/request.ts` (`requestLocale`,
  `hasLocale`), `src/proxy.ts` composes `createMiddleware(routing)` with CSP (spec 04).
* `<html>`/`<body>` stay in `[locale]/layout.tsx` (unchanged structure); `params` is awaited,
  unknown locales call `notFound()`, and the layout awaits `headers()` so every page renders
  dynamically (required by the CSP nonce, spec 04). `generateStaticParams` was removed for the same
  reason (the build previously prerendered `/ko` and `/en` as static HTML without a nonce).
* `agentRules: false` stops `next dev` from writing `AGENTS.md` into the repository.
* Zod 4 is imported through `src/lib/zod.ts` with `jitless: true`: its `new Function` capability
  probe is otherwise reported as a CSP `eval` violation in production.
* Tests: `vitest.config.mts` (jsdom, `@vitejs/plugin-react`, alias `@ -> src`),
  `vitest.setup.ts` (jest-dom matchers, `next/navigation` and `next-intl` mocks, `matchMedia`,
  `ResizeObserver`). Existing Jest tests are ported by replacing `jest.*` with `vi.*`.
* ESLint: `eslint.config.mjs` with `eslint-config-next/core-web-vitals` and `/typescript`; React
  Compiler rules from `eslint-plugin-react-hooks` 7 (`set-state-in-effect`, `immutability`,
  `preserve-manual-memoization`) flag patterns that predate the upgrade (hydration-safe
  localStorage reads in effects) and are set to `warn` until the UI pass; `no-explicit-any` is off
  in tests. Current result: 0 errors, 17 warnings.
* npm 11 `allowScripts`: install scripts of `@swc/core`, `unrs-resolver`, `@parcel/watcher` and the
  proto package's `prepare` are not run; none is needed (the proto tarball ships `dist/`, Next uses
  its bundled SWC).
* TypeScript 6.0.3 (design D6), `moduleResolution: bundler`, `jsx: react-jsx` (Next 16 default).
