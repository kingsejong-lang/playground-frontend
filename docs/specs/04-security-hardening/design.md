# 04 Security hardening — Design

* `src/lib/csp.ts` builds the policy: `buildCsp({ nonce, isDev, apiOrigin, embed })` and
  `securityHeaders({ embed })`. Pure functions, unit-tested.
* `src/proxy.ts`: generate nonce (`crypto.randomUUID` base64), run next-intl routing, then set
  `Content-Security-Policy` on the response and on the forwarded request (Next reads the nonce
  from the request header and applies it to its scripts), plus `x-nonce`.
* Static headers that do not depend on the request stay in `next.config.ts` `headers()`:
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production only),
  COOP. `X-Frame-Options` is set by the proxy because it depends on the route.
* Monaco: loaded by `@monaco-editor/loader` from jsDelivr through a nonce'd chunk;
  `'strict-dynamic'` trusts scripts it inserts. Monaco does not need `eval` in production
  . Inline styles from Monaco keep
  `style-src 'unsafe-inline'`.
* `COEP: require-corp` removed: it is not needed (no `SharedArrayBuffer`) and blocks third-party
  embedding of `/embed/*`; `CORP: same-origin` removed for the same reason. Documented trade-off:
  no cross-origin isolation.
