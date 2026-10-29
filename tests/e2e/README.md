# End-to-end tests (Playwright)

Two suites share the helpers in `helpers.ts`:

| Suite | Config | Backend | Where it runs |
|---|---|---|---|
| `fake/` | `playwright.config.ts` | development fake transport (`NEXT_PUBLIC_RPC_FAKE=1`, `next dev` on port 3100) | frontend CI, every push/PR |
| `stack/` (tests tagged `@stack`) | `playwright.stack.config.ts` | real gateway and services (`docker compose` in playground-backend), production build via `next start` on port 3000 | playground-backend CI (manual, nightly and on PRs touching the run path) |

## Fake backend (no services needed)

```bash
npx playwright install --only-shell chromium firefox webkit   # once
npm run test:e2e                               # starts `next dev` itself; Chromium, Firefox and WebKit
npm run test:e2e -- --project fake-chromium    # one browser (CI runs one job per browser)
npm run test:e2e:report
```

Failure modes come from the page URL (`?fake=compile_error`, `slow`, `output_limit`, `rate_limited`,
`unavailable`, ...; see `src/lib/rpc/fake.ts`), so every test is deterministic.

## Real stack (`@stack`)

```bash
# in playground-backend
make runtime-images && docker compose up -d --build   # gateway http://localhost:8080

# here
npm run test:e2e:stack            # builds with NEXT_PUBLIC_API_URL=http://localhost:8080, runs `next start -p 3000`
E2E_SKIP_BUILD=1 npm run test:e2e:stack   # reuse an existing build
E2E_RESUME_RUN=1 npm run test:e2e:stack   # also run the output-replay test (needs ResumeRun in the backend)
```

- Use `localhost` for both the app and the API. The session cookies are `Secure; SameSite=Strict`; browsers
  treat `http://localhost` as secure, but mixing in `127.0.0.1` stops the cookies from being sent.
- The gateway only accepts the Origin `http://localhost:3000` (`ALLOWED_ORIGINS`), hence the fixed port.
- Tests run one at a time: anonymous runs share a per-IP budget, and one test deliberately exceeds the
  anonymous limit (10 runs per minute) to check the rate-limit message.
- Covered: starter template and run, template gallery, multi-file runs (KingSejong `가져오기`, Python
  `import`, a Go package over two files), compile diagnostic jump, Python stdin, stop, output limit,
  share link in a new browser context and the embed view, register / settings persistence / logout,
  rate limit, and the backend-down state (requests to the gateway are aborted).
