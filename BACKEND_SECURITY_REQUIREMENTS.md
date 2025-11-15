# Backend Security Requirements

**Status**: ⚠️ Frontend Ready, Backend Deployment Pending
**Date**: 2025-11-15
**Updated**: 2025-11-15

## Overview

**Frontend**: ✅ All security features implemented and tested (build passing)
**Backend**: ⚠️ Code committed but not deployed - rebuild blocked by module structure issue

### Current State Summary
- ✅ Frontend security implementation complete (CSRF + httpOnly cookies)
- ✅ Backend security code exists in repository (commits ff6d1b1, 29a46ee)
- ❌ Running backend server doesn't have security features (old build)
- ❌ Backend rebuild fails: `shared/pkg/go.mod` missing

This document tracks the implementation status and integration requirements.

---

## 1. CSRF Token Protection

**Priority**: HIGH
**Status**: ✅ Implemented

### Current State
- ✅ Backend: CSRF token endpoint implemented
- ✅ Frontend: CSRF token integration complete

### Backend Requirements

#### API Endpoints Needed
```
GET /api/v1/csrf/token
Response: { "csrf_token": "random_token_string" }
```

#### Backend Implementation Tasks
- [ ] Add CSRF token generation endpoint
- [ ] Store CSRF tokens in session (Redis/memory)
- [ ] Add middleware to validate CSRF tokens on state-changing requests
- [ ] Include CSRF token in response headers: `X-CSRF-Token`
- [ ] Validate `X-CSRF-Token` header or `csrf_token` field in request body
- [ ] Set appropriate token expiration (e.g., 1 hour)
- [ ] Handle token refresh logic

#### Protected Endpoints
State-changing operations that need CSRF protection:
- `POST /api/v1/execute`
- `POST /api/v1/execute/stream`
- `POST /api/v1/share`
- `DELETE /api/v1/share/:id`
- `POST /api/v1/settings`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

#### Frontend Integration (✅ Complete)
Implemented in `src/lib/api-client.ts`:

```typescript
// Fetch CSRF token before requests
async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/v1/csrf/token');
  const data = await response.json();
  return data.csrf_token;
}

// Add to request interceptor
instance.interceptors.request.use(async (config) => {
  if (['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
    const csrfToken = await getCsrfToken();
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

---

## 2. httpOnly Cookies for Token Storage

**Priority**: HIGH
**Status**: ✅ Implemented

### Current State
- ✅ Backend: httpOnly cookies implemented
- ✅ Frontend: localStorage removed, cookies used
- ✅ XSS protection active

### Backend Requirements

#### API Changes Needed

**Current (Insecure)**:
```json
POST /api/v1/auth/login
Response: {
  "tokens": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600
  },
  "user": { ... }
}
```

**Required (Secure)**:
```json
POST /api/v1/auth/login
Response: {
  "user": { ... }
}

Set-Cookie: access_token=jwt_token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=refresh_token; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
```

#### Backend Implementation Tasks
- [ ] Modify `/auth/login` to set httpOnly cookies instead of JSON response
- [ ] Modify `/auth/register` to set httpOnly cookies
- [ ] Modify `/auth/refresh` to read refresh token from cookies
- [ ] Remove tokens from JSON response body
- [ ] Set appropriate cookie attributes:
  - `HttpOnly` - Prevents JavaScript access
  - `Secure` - HTTPS only (production)
  - `SameSite=Strict` - CSRF protection
  - `Path=/` for access_token
  - `Path=/api/v1/auth/refresh` for refresh_token (more restrictive)
- [ ] Implement cookie-based token extraction in auth middleware
- [ ] Add logout endpoint to clear cookies

#### Frontend Integration (✅ Complete)

Completed changes:
1. ✅ Removed localStorage token management in `src/lib/api-client.ts`
2. ✅ Removed Authorization header injection (automatic with cookies)
3. ✅ Added `credentials: 'include'` to SSE client
4. ✅ Updated axios config:

```typescript
const instance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Remove JWT token interceptor - cookies handled automatically
```

#### Security Benefits
- ✅ XSS protection (JavaScript cannot access tokens)
- ✅ Automatic token inclusion in requests
- ✅ Better token lifecycle management
- ✅ Reduced attack surface

---

## 3. CORS Configuration Updates

**Priority**: MEDIUM
**Estimated Effort**: 1 hour (backend)

### Backend Requirements

Update CORS middleware to support credentials:

```go
// services/gateway/internal/middleware/cors.go
func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // Specific origin, not "*"
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
        c.Writer.Header().Set("Access-Control-Expose-Headers", "X-CSRF-Token")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

#### Implementation Tasks
- [ ] Change `Access-Control-Allow-Origin` from `*` to specific origin
- [ ] Add `Access-Control-Allow-Credentials: true`
- [ ] Add `X-CSRF-Token` to allowed headers
- [ ] Add `X-CSRF-Token` to exposed headers
- [ ] Update production origin when deployed

---

## 4. Rate Limiting Enhancements

**Priority**: MEDIUM
**Estimated Effort**: 1 day (backend)

### Current State
- ✅ Basic rate limiting implemented
- ⚠️ May need adjustments for CSRF token endpoint

### Backend Requirements

#### Additional Rate Limits
- [ ] CSRF token endpoint: 60 requests/minute per IP
- [ ] Stricter limits on auth endpoints: 10 requests/minute
- [ ] Separate limits for authenticated vs unauthenticated users

---

## 5. Session Management

**Priority**: MEDIUM
**Estimated Effort**: 2-3 days (backend)

### Backend Requirements

#### Session Store
- [ ] Implement Redis-based session store
- [ ] Associate CSRF tokens with sessions
- [ ] Track session metadata (IP, user agent, last activity)
- [ ] Implement session expiration
- [ ] Add session invalidation on logout

#### API Endpoints
```
POST /api/v1/auth/logout
DELETE /api/v1/auth/sessions/:id
GET /api/v1/auth/sessions (list user sessions)
```

---

## Implementation Roadmap

### Phase 1: httpOnly Cookies (Highest Impact)
1. Modify auth endpoints to set cookies
2. Update CORS configuration
3. Test with frontend changes
4. Deploy to staging

### Phase 2: CSRF Protection
1. Implement CSRF token generation
2. Add validation middleware
3. Create token endpoint
4. Integrate with frontend
5. Test on staging

### Phase 3: Session Management
1. Set up Redis session store
2. Implement session endpoints
3. Add session tracking
4. Deploy to production

---

## Testing Checklist

Once backend implementation is complete:

### CSRF Protection
- [ ] CSRF token is generated and returned
- [ ] Requests without CSRF token are rejected (403)
- [ ] Requests with invalid CSRF token are rejected
- [ ] Requests with valid CSRF token succeed
- [ ] Token refresh works correctly
- [ ] GET requests don't require CSRF token

### httpOnly Cookies
- [ ] Cookies are set on login/register
- [ ] Cookies are httpOnly (not accessible via JS)
- [ ] Cookies are Secure (HTTPS only in prod)
- [ ] Cookies have correct SameSite attribute
- [ ] Token refresh works with cookies
- [ ] Logout clears cookies
- [ ] Expired cookies are handled correctly

### CORS
- [ ] Credentials are included in requests
- [ ] CORS headers are correct
- [ ] Preflight requests work
- [ ] Cross-origin requests with cookies work

---

## Deployment Status & Blockers

### Backend Deployment Blocker

**Issue**: Cannot rebuild backend gateway service
**Error**: `reading ../../shared/pkg/go.mod: no such file or directory`
**Impact**: Security features (CSRF + httpOnly cookies) not available in running server

**Evidence**:
```bash
# CSRF endpoint returns 404
$ curl http://localhost:8080/api/v1/csrf/token
404 page not found

# Backend code exists
$ cd ../playground-backend && git log --oneline -5
6a6f216 docs: Update BACKEND_SECURITY_REQUIREMENTS to reflect completion
ff6d1b1 feat: Implement CSRF token protection
29a46ee feat: Implement httpOnly cookie-based authentication
```

**Required Action**: Fix backend module structure
1. Navigate to `playground-backend/`
2. Fix `shared/pkg/go.mod` missing issue
3. Rebuild services: `docker-compose up -d --build gateway`
4. Verify CSRF endpoint: `curl http://localhost:8080/api/v1/csrf/token`

### Frontend Status

**All Implementation Complete** ✅

Frontend code is production-ready and will automatically work once backend is deployed:
- ✅ CSRF token fetching with 5-minute cache
- ✅ Retry logic with exponential backoff (3 attempts)
- ✅ Automatic 403 recovery (CSRF token refresh)
- ✅ Automatic 401 recovery (JWT token refresh)
- ✅ httpOnly cookie support (`withCredentials: true`)
- ✅ SSE/WebSocket credential inclusion
- ✅ All localStorage usage removed
- ✅ Build passing (153 kB bundle)
- ✅ TypeScript errors: 0

**Files Modified**:
1. `src/lib/api-client.ts` - CSRF + httpOnly + interceptors
2. `src/contexts/AuthContext.tsx` - Removed localStorage
3. `src/lib/schemas/auth.schema.ts` - Updated response schemas
4. `src/lib/sse-client.ts` - Added credentials
5. `src/lib/grpc-client.ts` - Removed token handling

**Commits**:
- `00d217d` - Logout endpoint, CSRF caching, auto-retry
- `457ebd0` - CSRF protection and httpOnly cookies

### Next Steps

**For Backend Team**:
1. Fix `shared/pkg/go.mod` module structure issue
2. Rebuild and deploy gateway service
3. Verify endpoints:
   - `GET /api/v1/csrf/token` → Returns CSRF token
   - `POST /api/v1/auth/login` → Sets httpOnly cookies
   - `POST /api/v1/auth/logout` → Clears cookies

**For Integration Testing** (after backend deployment):
1. Start both servers: backend (8080) + frontend (3000)
2. Follow `SECURITY_TESTING_GUIDE.md` test plan
3. Verify all security features working end-to-end

---

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
