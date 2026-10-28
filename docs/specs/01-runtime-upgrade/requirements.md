# 01 Runtime upgrade — Requirements

EARS keywords: WHEN (event), WHILE (state), WHERE (feature), IF/THEN (unwanted), SHALL.

| Id | Requirement | Acceptance criteria |
|---|---|---|
| R1.1 | The project SHALL declare Node 26 LTS as its runtime. | `.nvmrc` contains `26`; `package.json` `engines.node` is `>=26.12.1`; `packageManager` is `npm@11.x`. |
| R1.2 | The project SHALL build with Next.js 16.4.x, React 19.3.x and Turbopack (default bundler). | `npm run build` exits 0 and prints `Next.js 16.4.3 (Turbopack)`. |
| R1.3 | WHEN a request reaches a localized route, the system SHALL route it with next-intl 4 from `src/proxy.ts` (nodejs runtime). | `/` redirects to `/ko`; `/en` renders; no `middleware.ts` remains. |
| R1.4 | Server components SHALL await `params`/`searchParams`/`cookies()`/`headers()`. | `tsc --noEmit` passes with Next 16 types; no sync access remains (grep). |
| R1.5 | The project SHALL lint with the ESLint CLI (ESLint 10, flat config, `eslint-config-next` 16). | `npm run lint` exits 0; no `next lint` script. |
| R1.6 | The project SHALL type-check with a TypeScript version supported by its tooling. | `npm run typecheck` exits 0; decision on TS 7 vs 6 documented (design D6). |
| R1.7 | Styles SHALL use Tailwind 4 CSS-first configuration produced by `@tailwindcss/upgrade`. | No `tailwind.config.*`; `globals.css` imports `tailwindcss`; build output contains utilities used in components. |
| R1.8 | Unit tests SHALL run on a runner that loads ESM-only dependencies without transforms. | `npm test` exits 0 (Vitest, design D7). |
| R1.9 | IF a dependency is unmaintained or webpack-only, THEN it SHALL be removed or replaced. | `next-pwa` removed (design D8); no webpack-only plugin in `next.config.ts`. |
| R1.10 | The dependency tree SHALL have no known vulnerabilities. | `npm audit` and `npm audit --omit=dev` report `found 0 vulnerabilities`. |
| R1.11 | `next.config` SHALL not contain keys removed in Next 16. | No `swcMinify`; no `modularizeImports` for test libraries; `next build` prints no config warnings. |
