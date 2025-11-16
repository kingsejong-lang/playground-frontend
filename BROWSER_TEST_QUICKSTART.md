# Browser Test Quick Start Guide

**Ready to test?** This guide helps you quickly verify all security features in the browser.

## Prerequisites

✅ Backend running on `http://localhost:8080`
✅ Frontend running on `http://localhost:3001`
✅ API tests passed (see `API_TEST_SUMMARY.md`)

## Quick Test (5 minutes)

### 1. Open Browser DevTools

1. Open Chrome/Firefox/Safari
2. Navigate to `http://localhost:3001`
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)

### 2. Test httpOnly Cookies (1 min)

**What to do:**
1. Click "회원가입" (Register) or "로그인" (Login)
2. Fill in credentials and submit

**What to check:**
- Go to DevTools → Application → Cookies → `http://localhost:3001`
- You should see:
  - ✅ `access_token` with HttpOnly ✓
  - ✅ `refresh_token` with HttpOnly ✓
  - ✅ `session_id`

**Expected Result:**
```
Name            Value           HttpOnly    Path                        SameSite
access_token    eyJhbGci...     ✓           /                           Lax
refresh_token   eyJhbGci...     ✓           /api/v1/auth/refresh        Strict
session_id      <random>        -           /                           Lax
```

### 3. Test XSS Protection (1 min)

**What to do:**
1. Open DevTools Console
2. Try to access tokens:
```javascript
document.cookie
```

**Expected Result:**
```
"session_id=xxxxx"
```

**What to check:**
- ✅ `access_token` NOT visible (httpOnly protection working!)
- ✅ `refresh_token` NOT visible (httpOnly protection working!)
- ✅ Only `session_id` visible (non-httpOnly cookie)

### 4. Test CSRF Protection (1 min)

**What to do:**
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Click any action that modifies data (회원가입, 로그인, etc.)
4. Check the request headers

**What to check:**
- ✅ Request has `X-CSRF-Token` header
- ✅ Token value is non-empty
- ✅ Request succeeds with 200/201 status

### 5. Test Auto Token Refresh (2 min)

**What to do:**
1. Open DevTools → Application → Cookies
2. Find `access_token` cookie
3. Right-click → Delete `access_token`
4. Try to access a protected feature (e.g., "내 코드" / My Code)

**Expected Result:**
- ✅ 401 error caught automatically
- ✅ Frontend calls `/api/v1/auth/refresh` automatically
- ✅ New `access_token` appears in cookies
- ✅ Original request retries and succeeds

**How to verify:**
1. DevTools → Network tab
2. Look for sequence:
   - First request → 401 Unauthorized
   - `/api/v1/auth/refresh` → 200 OK
   - Retry original request → 200 OK

### 6. Test Logout (1 min)

**What to do:**
1. Make sure you're logged in
2. Check cookies (should see access_token, refresh_token)
3. Click "로그아웃" (Logout)
4. Check cookies again

**Expected Result:**
- ✅ `access_token` deleted
- ✅ `refresh_token` deleted
- ✅ `session_id` may remain (not auth-related)
- ✅ Redirected to login/home page

## Detailed Test (Optional)

For comprehensive testing, follow `BROWSER_TEST_CHECKLIST.md` which includes:

- Input sanitization testing
- Rate limiting verification
- CORS credentials testing
- Network failure scenarios

## Common Issues

### Issue: Cookies not appearing

**Check:**
1. Backend is running on port 8080
2. Frontend is running on port 3001
3. No browser extensions blocking cookies
4. Using http://localhost:3001 (not 127.0.0.1)

### Issue: CSRF token missing

**Check:**
1. Session cookie (`session_id`) exists
2. CSRF token fetched on page load
3. Network tab shows `/api/v1/csrf/token` request succeeded

### Issue: Auto-refresh not working

**Check:**
1. DevTools → Console for error messages
2. Network tab for failed refresh requests
3. `refresh_token` cookie exists and hasn't expired

## Test Checklist

Use this to track your progress:

- [ ] httpOnly cookies verified in DevTools
- [ ] XSS protection confirmed (tokens not in document.cookie)
- [ ] CSRF token sent with requests
- [ ] Auto token refresh working (401 → refresh → retry)
- [ ] Logout clears cookies
- [ ] (Optional) Input sanitization tested
- [ ] (Optional) Rate limiting tested
- [ ] (Optional) CORS credentials tested

## Success Criteria

All 5 quick tests should pass with ✅ results. If any fail, check:

1. `API_TEST_SUMMARY.md` - Verify API tests passed
2. `INTEGRATION_TEST_RESULTS.md` - Check implementation status
3. Browser console for JavaScript errors
4. Backend logs for server errors

## Next Steps

After completing browser tests:

1. ✅ Document results in `INTEGRATION_TEST_RESULTS.md`
2. ✅ Update status to "프로덕션 준비 완료" (Production Ready)
3. ✅ Commit all changes
4. 🚀 Deploy to production

## Reference Documents

- **Detailed Tests**: `BROWSER_TEST_CHECKLIST.md`
- **API Results**: `API_TEST_SUMMARY.md`
- **Implementation**: `BACKEND_SECURITY_REQUIREMENTS.md`
- **Overall Status**: `INTEGRATION_TEST_RESULTS.md`

## Screenshot Guide

When testing, take screenshots of:

1. **DevTools Cookies Tab** - Showing httpOnly flags
2. **Console** - Showing document.cookie output (without tokens)
3. **Network Tab** - Showing CSRF token in request headers
4. **Network Tab** - Showing auto-refresh sequence (401 → refresh → retry)
5. **Cookies After Logout** - Showing deleted auth cookies

Save screenshots to document successful testing!

---

**Questions?** Check `SECURITY_TESTING_GUIDE.md` for detailed explanations of each security feature.
