# 브라우저 통합 테스트 체크리스트

**날짜**: 2025-11-17
**테스터**: _____________
**브라우저**: Chrome / Firefox / Safari (선택)

---

## 사전 준비

### 서버 실행 확인

- [ ] 백엔드 서버 실행 중: `http://localhost:8080`
  ```bash
  curl http://localhost:8080/health
  # 예상: {"service":"gateway","status":"ok"}
  ```

- [ ] 프론트엔드 서버 실행 중: `http://localhost:3001`
  ```bash
  curl http://localhost:3001
  # 예상: HTML 응답
  ```

- [ ] CSRF 엔드포인트 작동 확인:
  ```bash
  curl http://localhost:8080/api/v1/csrf/token
  # 예상: {"csrf_token":"...","expires_in":3600}
  ```

---

## 테스트 1: httpOnly 쿠키 설정 확인

### 1.1 브라우저 열기
- [ ] Chrome/Firefox/Safari에서 `http://localhost:3001` 접속
- [ ] DevTools 열기 (F12 또는 Cmd+Option+I)

### 1.2 회원가입 시도
- [ ] 회원가입 페이지로 이동
- [ ] 새 계정 정보 입력:
  - Email: `testuser@example.com`
  - Password: `Test123456`
  - Name: `Test User`
- [ ] "회원가입" 버튼 클릭

### 1.3 Network 탭 확인
- [ ] DevTools → Network 탭 열기
- [ ] `POST /api/v1/auth/register` 요청 찾기
- [ ] Request Headers 확인:
  - [ ] `X-CSRF-Token: <token>` 헤더 존재
  - [ ] `Cookie: session_id=<id>` 헤더 존재
- [ ] Response Headers 확인:
  - [ ] `Set-Cookie: access_token=...; HttpOnly` 존재
  - [ ] `Set-Cookie: refresh_token=...; HttpOnly; SameSite=Strict` 존재

### 1.4 Application 탭 확인
- [ ] DevTools → Application → Cookies → `localhost:3001` 선택
- [ ] 쿠키 확인:
  - [ ] `access_token`: HttpOnly ✅, Secure (prod only)
  - [ ] `refresh_token`: HttpOnly ✅, SameSite=Strict ✅
  - [ ] `session_id`: HttpOnly ❌ (CSRF용이므로 정상)

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 2: XSS 보호 검증

### 2.1 Console에서 토큰 접근 시도
- [ ] DevTools → Console 탭 열기
- [ ] 다음 명령어 실행:

```javascript
// localStorage에서 토큰 접근 시도
localStorage.getItem('access_token')
// 예상 결과: null ✅
```

```javascript
// document.cookie로 access_token 접근 시도
document.cookie
// 예상 결과: access_token이 보이지 않음 ✅
// session_id만 보여야 함 (HttpOnly가 아니므로)
```

### 2.2 결과 확인
- [ ] localStorage에 토큰 없음 ✅
- [ ] document.cookie에 access_token 없음 ✅
- [ ] document.cookie에 session_id만 보임 ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 3: CSRF 자동 보호 확인

### 3.1 코드 실행 요청
- [ ] 메인 페이지에서 코드 입력:
  ```python
  print("Hello, World!")
  ```
- [ ] "실행" 버튼 클릭

### 3.2 Network 탭 확인
- [ ] `POST /api/v1/execute` 요청 찾기
- [ ] Request Headers 확인:
  - [ ] `X-CSRF-Token: <token>` 헤더 자동 포함 ✅
  - [ ] `Cookie: access_token=...` 헤더 자동 포함 ✅
- [ ] Response 확인:
  - [ ] 성공 응답 (200 OK) ✅
  - [ ] 코드 실행 결과 출력됨 ✅

### 3.3 CSRF 토큰 캐싱 확인
- [ ] 다시 코드 실행 (또는 다른 POST 요청)
- [ ] Network 탭 확인:
  - [ ] `GET /api/v1/csrf/token` 요청이 **없음** (캐시 사용) ✅
  - [ ] 5분 대기 후 다시 실행 시 새 토큰 fetch ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 4: 자동 토큰 갱신

### 4.1 Access Token 만료 대기 (15분)
- [ ] 로그인 후 15분 대기 (또는 백엔드 설정에 따라 조정)
- [ ] 또는 DevTools → Application → Cookies에서 `access_token` 삭제

### 4.2 API 요청 실행
- [ ] 코드 실행 또는 다른 API 요청
- [ ] Network 탭 확인:
  ```
  1. POST /api/v1/execute → 401 Unauthorized
  2. POST /api/v1/auth/refresh → 200 OK (새 토큰 발급)
  3. POST /api/v1/execute → 200 OK (원래 요청 재시도)
  ```

### 4.3 사용자 경험 확인
- [ ] 사용자는 로그인 화면으로 리다이렉트되지 **않음** ✅
- [ ] 요청이 자동으로 재시도되어 성공 ✅
- [ ] 에러 메시지 없음 ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 5: CSRF 토큰 갱신

### 5.1 CSRF 토큰 무효화
- [ ] DevTools → Application → Cookies에서 `session_id` 삭제
- [ ] 또는 백엔드 Redis에서 CSRF 토큰 삭제

### 5.2 POST 요청 실행
- [ ] 코드 실행
- [ ] Network 탭 확인:
  ```
  1. POST /api/v1/execute → 403 Forbidden (CSRF 검증 실패)
  2. GET /api/v1/csrf/token → 200 OK (새 토큰 발급)
  3. POST /api/v1/execute → 200 OK (재시도 성공)
  ```

### 5.3 결과 확인
- [ ] 자동으로 새 CSRF 토큰 발급 ✅
- [ ] 요청 자동 재시도 ✅
- [ ] 사용자는 에러를 인지하지 못함 ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 6: 로그아웃

### 6.1 로그아웃 실행
- [ ] "로그아웃" 버튼 클릭
- [ ] Network 탭 확인:
  - [ ] `POST /api/v1/auth/logout` 요청 ✅
  - [ ] Response: 200 OK ✅

### 6.2 쿠키 삭제 확인
- [ ] DevTools → Application → Cookies 확인:
  - [ ] `access_token` 삭제됨 ✅
  - [ ] `refresh_token` 삭제됨 ✅
  - [ ] `session_id` 남아있음 (CSRF용, 정상) ✅

### 6.3 인증 확인
- [ ] 인증 필요한 페이지 접근 시도
- [ ] 로그인 페이지로 리다이렉트됨 ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 7: CORS 및 Credentials

### 7.1 Preflight 요청 확인
- [ ] Network 탭에서 OPTIONS 요청 확인
- [ ] Response Headers 확인:
  - [ ] `Access-Control-Allow-Origin: http://localhost:3001` ✅
  - [ ] `Access-Control-Allow-Credentials: true` ✅
  - [ ] `Access-Control-Allow-Headers: ... X-CSRF-Token ...` ✅

### 7.2 실제 요청 확인
- [ ] POST 요청의 Response Headers 확인:
  - [ ] `Access-Control-Allow-Origin: http://localhost:3001` ✅
  - [ ] `Access-Control-Allow-Credentials: true` ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 8: Rate Limiting

### 8.1 연속 요청 테스트
- [ ] Console에서 100번 연속 요청:
  ```javascript
  for (let i = 0; i < 100; i++) {
    fetch('http://localhost:8080/api/v1/csrf/token')
      .then(r => console.log(i, r.status));
  }
  ```

### 8.2 Rate Limit 확인
- [ ] 일정 횟수 후 429 Too Many Requests 응답 ✅
- [ ] Response Headers 확인:
  - [ ] `X-RateLimit-Limit: 100` ✅
  - [ ] `X-RateLimit-Remaining: 0` ✅
  - [ ] `Retry-After: <seconds>` ✅

**결과**: ✅ / ❌ / ⚠️

---

## 테스트 9: 입력 검증 및 XSS 방지

### 9.1 Snippet 라이브러리 테스트
- [ ] Ctrl+L로 Snippet Library 열기
- [ ] XSS 시도 입력:
  - Title: `<script>alert('XSS')</script>`
  - Description: `<img src=x onerror=alert('XSS')>`
  - Code: `console.log("<script>alert('test')</script>")`
- [ ] "Save" 클릭

### 9.2 새니타이징 확인
- [ ] 저장된 snippet 확인:
  - [ ] `<script>` 태그가 제거되거나 이스케이프됨 ✅
  - [ ] `onerror` 이벤트 핸들러 제거됨 ✅
  - [ ] 제목 길이 200자로 제한됨 ✅
  - [ ] 태그 개수 20개로 제한됨 ✅

**결과**: ✅ / ❌ / ⚠️

---

## 종합 결과

### 보안 기능 체크리스트

| 기능 | 상태 | 비고 |
|------|------|------|
| httpOnly 쿠키 설정 | ✅ / ❌ / ⚠️ | |
| XSS 보호 (localStorage 제거) | ✅ / ❌ / ⚠️ | |
| CSRF 자동 보호 | ✅ / ❌ / ⚠️ | |
| 자동 토큰 갱신 (401) | ✅ / ❌ / ⚠️ | |
| 자동 CSRF 갱신 (403) | ✅ / ❌ / ⚠️ | |
| 로그아웃 (쿠키 삭제) | ✅ / ❌ / ⚠️ | |
| CORS + Credentials | ✅ / ❌ / ⚠️ | |
| Rate Limiting | ✅ / ❌ / ⚠️ | |
| 입력 새니타이징 | ✅ / ❌ / ⚠️ | |

### 전체 평가

- **통과**: ___ / 9
- **실패**: ___ / 9
- **주의**: ___ / 9

### 발견된 문제

1.
2.
3.

### 권장 사항

1.
2.
3.

---

## 서명

**테스터**: _________________ **날짜**: _________________ **서명**: _________________

---

## 참고 문서

- `BACKEND_SECURITY_REQUIREMENTS.md` - 보안 요구사항
- `INTEGRATION_TEST_RESULTS.md` - 통합 테스트 결과
- `SECURITY_TESTING_GUIDE.md` - 보안 테스트 가이드
