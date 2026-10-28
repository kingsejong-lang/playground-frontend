# 04 Security hardening — Requirements

| Id | Requirement | Acceptance criteria |
|---|---|---|
| R4.1 | The frontend SHALL NOT store authentication tokens in JS-accessible storage. | No `localStorage`/`sessionStorage`/`document.cookie` access for tokens (grep + architecture test). |
| R4.2 | Every HTML response SHALL carry a CSP with a per-request nonce and `'strict-dynamic'` for scripts. | `curl -I /ko` shows `script-src 'self' 'nonce-…' 'strict-dynamic'`; nonce differs between requests. |
| R4.3 | WHERE the build is production, `script-src` SHALL NOT contain `'unsafe-eval'` or `'unsafe-inline'`. | Proxy unit test for production policy; editor loads in `next start` without CSP violations (browser check). |
| R4.4 | `connect-src` SHALL be limited to `'self'` and the API origin (plus the Monaco CDN for source maps, and HMR websockets only in development). | Proxy unit test. |
| R4.5 | Shared titles and descriptions SHALL be rendered as text, never as HTML. | No `dangerouslySetInnerHTML` in `src/` (architecture test); share title shown via JSX text. |
| R4.6 | The `X-XSS-Protection` header SHALL be removed. | `next.config.ts` and `lib/csp.ts` contain no `X-XSS-Protection`. |
| R4.7 | WHERE the route is `/[locale]/embed/*`, framing by other origins SHALL be allowed; elsewhere framing SHALL be denied. | Proxy unit test: embed policy has `frame-ancestors *` and no `X-Frame-Options`; others `frame-ancestors 'none'` + `X-Frame-Options: DENY`. |
| R4.8 | The client SHALL rely on Origin + `Connect-Protocol-Version` + SameSite cookies, not CSRF tokens. | `csrf.ts` deleted; transport test asserts protocol header. |
