# 04 Security hardening — Tasks

| # | Task | Req | Status |
|---|---|---|---|
| T4.1 | Tests first: `csp.test.ts` (prod/dev, connect-src, embed framing, no XSS header) | R4.2–R4.7 | done |
| T4.2 | Implement `lib/csp.ts`, `proxy.ts` | R4.2–R4.7 | done |
| T4.3 | Remove CSP/XSS headers from `next.config`, remove meta CSP from layout | R4.6 | done |
| T4.4 | Architecture test: no `dangerouslySetInnerHTML`, no token storage | R4.1, R4.5 | done |
| T4.5 | Verify production build loads editor without CSP violations | R4.3 | done (Chrome, `next start`: Monaco from jsDelivr loads; only console errors are the browser's own `ERR_CONNECTION_REFUSED` for the absent backend) |
| T4.6 | Zod `jitless` to avoid the CSP eval probe | R4.3 | done |
| T4.7 | Remove COEP/CORP (block `/embed` framing, no SharedArrayBuffer use) | R4.7 | done |
