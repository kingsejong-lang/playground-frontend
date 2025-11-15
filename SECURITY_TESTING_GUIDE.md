# Security Testing Guide

**Date**: 2025-11-15
**Status**: Ready for Testing
**Dependencies**: Backend must be running with security features enabled

---

## Prerequisites

### Backend Requirements
- ✅ Backend server running on `http://localhost:8080`
- ✅ CSRF token endpoint: `GET /api/v1/csrf/token`
- ✅ httpOnly cookies enabled for login/register
- ✅ CORS configured with `credentials: true`

### Frontend Requirements
- ✅ All security features implemented
- ✅ Build passing
- ✅ No TypeScript errors

---

## Test Environment Setup

### 1. Start Backend
```bash
cd ../playground-backend
make run-dev

# Verify backend is running
curl http://localhost:8080/health
```

### 2. Start Frontend
```bash
cd playground-frontend
npm run dev

# Frontend should be running on http://localhost:3000
```

---

## Testing Checklist

### ✅ 1. CSRF Protection

#### Test 1.1: CSRF Token Generation
```bash
# Should return a CSRF token
curl -v http://localhost:8080/api/v1/csrf/token

# Expected response:
# {"csrf_token":"some-random-token"}
```

**Browser Test**:
1. Open DevTools → Network tab
2. Make any POST request (e.g., login)
3. Check Request Headers → Should see `X-CSRF-Token: ...`

#### Test 1.2: CSRF Token Validation
**Test**: POST request without CSRF token should fail
```bash
curl -X POST http://localhost:8080/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","files":{"main.py":"print(1)"}}'

# Expected: 403 Forbidden
```

#### Test 1.3: CSRF Token Caching
**Browser Console**:
```javascript
// Make multiple POST requests
await fetch('/api/v1/some-endpoint', { method: 'POST' });
await fetch('/api/v1/another-endpoint', { method: 'POST' });

// Check Network tab:
// - First request should fetch CSRF token
// - Second request should use cached token (no new /csrf/token call)
```

#### Test 1.4: CSRF Token Retry on 403
1. Invalidate CSRF token on backend
2. Make POST request
3. **Expected**: Automatic retry with new token

---

### ✅ 2. httpOnly Cookies

#### Test 2.1: Cookie Set on Login
1. Open DevTools → Application → Cookies → `http://localhost:3000`
2. Log in with valid credentials
3. **Check**:
   - `access_token` cookie exists
   - `HttpOnly` flag is checked ✅
   - `Secure` flag (HTTPS only, may be unchecked in dev)
   - `SameSite` = Strict

#### Test 2.2: Cookies Not Accessible via JavaScript
**Browser Console**:
```javascript
document.cookie
// Should NOT see access_token or refresh_token
// Only non-httpOnly cookies are visible
```

#### Test 2.3: Cookies Automatically Included
1. Log in
2. Make any authenticated API call
3. **Check Network tab**:
   - Request Headers → `Cookie: access_token=...; refresh_token=...`
   - No `Authorization` header ❌ (removed)

#### Test 2.4: Cookies Cleared on Logout
1. Log in (cookies set)
2. Log out
3. **Check DevTools → Application → Cookies**:
   - `access_token` should be deleted
   - `refresh_token` should be deleted

---

### ✅ 3. Token Refresh

#### Test 3.1: Automatic Token Refresh on 401
1. Wait for access token to expire (or manually invalidate)
2. Make any authenticated request
3. **Expected**:
   - First request gets 401
   - Automatic refresh token call
   - Original request retried successfully
   - No user intervention needed

**Browser Console** (check Network tab):
```
1. GET /api/v1/some-endpoint → 401 Unauthorized
2. POST /api/v1/auth/refresh → 200 OK (new cookies set)
3. GET /api/v1/some-endpoint → 200 OK (retry succeeds)
```

---

### ✅ 4. Authentication Flow

#### Test 4.1: User Registration
```javascript
// All localStorage calls removed
// Tokens stored as httpOnly cookies only
```

1. Register new user
2. **Check**:
   - No `localStorage.setItem('access_token')` calls
   - Cookies set automatically
   - User state updated in React

#### Test 4.2: User Login
1. Log in with valid credentials
2. **Check**:
   - Response does NOT contain `tokens` field
   - Cookies set via `Set-Cookie` header
   - User redirected/state updated

#### Test 4.3: Protected Routes
1. Visit protected route without login → Redirect to login
2. Log in → Access granted
3. **Check**: Authentication uses cookies, not localStorage

---

### ✅ 5. SSE/WebSocket with Credentials

#### Test 5.1: SSE Stream Includes Cookies
1. Start code execution (SSE stream)
2. **Check Network tab → execute/stream**:
   - Request Headers → `Cookie: access_token=...`
   - Connection successful with authentication

---

### ✅ 6. Security Validation

#### Test 6.1: XSS Protection
**Browser Console** (should fail):
```javascript
// Try to steal token
const token = localStorage.getItem('access_token');
console.log(token); // null ✅

// Try to access httpOnly cookie
document.cookie.match(/access_token/); // null ✅
```

**Result**: ✅ Tokens are NOT accessible to JavaScript

#### Test 6.2: CSRF Protection
```bash
# External site trying to make request (without CSRF token)
curl -X POST http://localhost:8080/api/v1/execute \
  -H "Cookie: access_token=stolen-token" \
  -H "Content-Type: application/json" \
  -d '{"language":"python","files":{"main.py":"print(1)"}}'

# Expected: 403 Forbidden (missing CSRF token)
```

#### Test 6.3: SameSite Cookie Protection
1. Open http://malicious-site.com
2. Try to make request to http://localhost:8080
3. **Expected**: Cookies NOT sent (SameSite=Strict)

---

## Common Issues

### Issue 1: CORS Error
**Symptom**: `Access-Control-Allow-Origin` error

**Check Backend**:
```go
// Should allow credentials
Access-Control-Allow-Origin: http://localhost:3000  // NOT *
Access-Control-Allow-Credentials: true
```

### Issue 2: Cookies Not Set
**Check**:
1. Backend sends `Set-Cookie` header
2. Frontend uses `withCredentials: true`
3. Domains match (localhost:3000 ↔ localhost:8080)

### Issue 3: CSRF Token Always Fails
**Check**:
1. Backend CSRF endpoint returns token
2. Token is valid for at least 5 minutes
3. Token is session-based (tied to user)

---

## Performance Checks

### CSRF Token Caching
- ✅ First POST request: Fetches CSRF token
- ✅ Subsequent requests (within 5 min): Uses cached token
- ✅ After 5 min: Fetches new token

### Token Refresh
- ✅ Access token expires → Auto refresh
- ✅ Refresh succeeds → Original request retried
- ✅ No page reload needed

---

## Security Checklist

- [ ] localStorage NEVER stores tokens
- [ ] Cookies have HttpOnly flag
- [ ] Cookies have Secure flag (production)
- [ ] Cookies have SameSite=Strict
- [ ] CSRF tokens required for POST/PUT/DELETE
- [ ] CSRF tokens cached (max 5 min)
- [ ] 403 errors trigger CSRF token refresh
- [ ] 401 errors trigger token refresh
- [ ] Logout clears cookies
- [ ] JavaScript cannot access tokens

---

## Browser DevTools Quick Guide

### Check Cookies
```
DevTools → Application → Cookies → http://localhost:3000
- access_token ✅ HttpOnly ✅
- refresh_token ✅ HttpOnly ✅
```

### Check Network Request
```
DevTools → Network → [Request] → Headers tab
- Request Headers:
  - Cookie: access_token=...  ✅
  - X-CSRF-Token: ...         ✅
- Response Headers:
  - Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict
```

### Check Console (should be empty)
```javascript
localStorage.getItem('access_token') // null ✅
document.cookie // (should not show access_token) ✅
```

---

## Test Report Template

```markdown
## Security Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Backend Version**: [Version]
**Frontend Version**: [Version]

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| CSRF Token Generation | ✅ / ❌ | |
| CSRF Token Validation | ✅ / ❌ | |
| httpOnly Cookies Set | ✅ / ❌ | |
| Cookies Not Accessible | ✅ / ❌ | |
| Token Auto Refresh | ✅ / ❌ | |
| Logout Clears Cookies | ✅ / ❌ | |
| XSS Protection | ✅ / ❌ | |
| CSRF Protection | ✅ / ❌ | |

### Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

1. [Recommendation]
2. [Recommendation]
```

---

**Next Steps**: After testing, update `BACKEND_SECURITY_REQUIREMENTS.md` with test results.
