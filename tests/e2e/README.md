# E2E Tests

Playwright tests for the playground frontend.

* `smoke.spec.ts` needs no backend: the dev server is started with
  `NEXT_PUBLIC_API_URL=http://127.0.0.1:9` (closed port), and the tests check that `/ko`
  renders with a "server unavailable" message, the CSP nonce header, locale redirect and
  embed framing headers.
* Flows that need a running gateway (run, share, sign-in) are not covered yet. Set
  `E2E_API_URL` to a gateway origin to run the app against it.

```bash
npx playwright install chromium   # once
npm run test:e2e
npm run test:e2e:report
```

The previous specs (`authentication`, `code-execution`, `code-sharing`) targeted routes that do
not exist (`/auth/login`, `/share/:id`) and the removed REST API; they were removed in the
Connect migration (see `docs/refactoring/REFACTORING_DESIGN.md`).
