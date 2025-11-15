# Backend Security Requirements

**Status**: Pending backend implementation
**Date**: 2025-11-15

## Overview

This document outlines security features that require backend implementation before they can be fully integrated into the frontend. The frontend has been prepared to support these features once the backend endpoints are available.

---

## 1. CSRF Token Protection

**Priority**: HIGH
**Estimated Effort**: 2-3 days (backend)

### Current State
- ❌ Not implemented (requires backend support)

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

#### Frontend Integration (Pending)
Once backend is ready, update `src/lib/api-client.ts`:

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
**Estimated Effort**: 1-2 days (backend)

### Current State
- ❌ Not implemented (requires backend support)
- ⚠️ Currently using localStorage (vulnerable to XSS)

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

#### Frontend Integration (Pending)
Once backend is ready:

1. Remove localStorage token management in `src/lib/api-client.ts`
2. Remove Authorization header injection (automatic with cookies)
3. Add `credentials: 'include'` to all fetch requests
4. Update axios config:

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

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
