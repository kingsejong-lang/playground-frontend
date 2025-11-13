# 킹세종 Playground 프론트엔드 우선순위 로드맵

**생성일**: 2025-11-14
**백엔드 상태**: ✅ 100% 완료 (131/131 작업)
**프론트엔드 상태**: 🚧 65% 완료 (MVP + Auth 완료)

---

## 🎯 현재 상황

### ✅ 완료된 기능
- Next.js 14 + TypeScript + React 18
- Monaco Editor 통합
- REST API 클라이언트 (15/17 엔드포인트)
- SSE 실시간 스트리밍
- JWT 인증 (로그인/회원가입)
- 코드 공유 기능
- 사용자 설정
- 다크 테마 UI

### ⚠️ 즉시 필요한 개선사항
- **보안**: CSP, CSRF, Zod 검증 없음
- **안정성**: Error Boundary 없음 (에러 시 앱 크래시)
- **코드 품질**: page.tsx 523줄 (너무 큼)
- **테스트**: 0개 테스트 파일
- **프로토콜**: WebSocket, gRPC-Web 미구현

---

## 📋 작업 우선순위 (Phase별)

## Phase 4: 보안 & 품질 강화 (1주) 🔥

**목표**: 프로덕션 레디 보안 수준 달성

### Task #1: Content Security Policy (CSP) ⚡ CRITICAL
**예상 시간**: 1일
**이유**: XSS 공격 방어 필수

**작업 내용**:
```typescript
// next.config.mjs
- CSP 헤더 추가
- Monaco Editor CDN 허용
- Inline script nonce 기반 허용
- 개발/프로덕션 환경별 정책
```

**체크리스트**:
- [ ] `next.config.mjs`에 CSP 헤더 추가
- [ ] `app/layout.tsx`에 Meta 태그 추가
- [ ] `src/lib/csp.ts` 헬퍼 함수 생성
- [ ] 개발 환경 테스트
- [ ] 프로덕션 환경 테스트

---

### Task #2: Zod 런타임 검증 ⚡ CRITICAL
**예상 시간**: 2일
**이유**: API 타입 안전성 보장

**작업 내용**:
```typescript
// src/lib/schemas/execution.schema.ts
- 모든 API 요청/응답 스키마 정의
- 자동 타입 추론
- 에러 처리 개선
```

**체크리스트**:
- [ ] Zod 패키지 설치
- [ ] 5개 스키마 파일 생성 (auth, execution, language, share, settings)
- [ ] API 클라이언트에 검증 로직 추가
- [ ] 단위 테스트 작성
- [ ] 에러 메시지 개선

---

### Task #3: React Error Boundary 🔴 HIGH
**예상 시간**: 0.5일
**이유**: 앱 크래시 방지

**작업 내용**:
```typescript
// src/components/ErrorBoundary.tsx
- react-error-boundary 사용
- Fallback UI 디자인
- 에러 로깅 (Sentry or console)
- 재시도 버튼
```

**체크리스트**:
- [ ] `react-error-boundary` 설치
- [ ] ErrorBoundary 컴포넌트 생성
- [ ] Fallback UI 구현
- [ ] `app/providers.tsx`에 래핑
- [ ] 에러 로깅 추가

---

### Task #4: 커스텀 훅 리팩토링 🔴 HIGH
**예상 시간**: 2일
**이유**: page.tsx 523줄 → 200줄 이하로 축소

**작업 내용**:
```typescript
// src/hooks/
- useCodeExecution.ts (실행 로직)
- useSettings.ts (설정 관리)
- useShare.ts (공유 관리)
- useLanguages.ts (언어 선택)
- useSSE.ts (스트리밍)
```

**체크리스트**:
- [ ] 5개 커스텀 훅 생성
- [ ] page.tsx 리팩토링
- [ ] 단위 테스트 작성
- [ ] 재사용성 검증

---

### Task #5: 테스트 인프라 구축 🔴 HIGH
**예상 시간**: 2일
**목표**: 80% 테스트 커버리지

**작업 내용**:
```bash
# 설치
- Jest + React Testing Library
- MSW (Mock Service Worker)
- @testing-library/react-hooks

# 테스트
- 컴포넌트 테스트 (5개)
- 훅 테스트 (5개)
- API 클라이언트 테스트
```

**체크리스트**:
- [ ] Jest 설정
- [ ] MSW 설정
- [ ] 10개 테스트 파일 작성
- [ ] CI/CD 통합
- [ ] 커버리지 리포트 생성

---

## Phase 5: UX & 기능 개선 (2주)

### Task #6: Toast 알림 시스템 🟡 MEDIUM
**예상 시간**: 1일

**작업 내용**:
- Toast 컴포넌트 생성
- useToast 훅
- Success/Error/Warning/Info 타입
- 자동 사라짐 (5초)

---

### Task #7: 키보드 단축키 🟡 MEDIUM
**예상 시간**: 1일

**단축키**:
- `Ctrl/Cmd + Enter`: 코드 실행
- `Ctrl/Cmd + Shift + Enter`: 스트림 실행
- `Ctrl/Cmd + S`: 설정 저장
- `Ctrl/Cmd + K`: 출력 지우기
- `Ctrl/Cmd + ,`: 설정 열기

---

### Task #8: WebSocket 클라이언트 🟡 MEDIUM
**예상 시간**: 2일
**참고**: 백엔드 WebSocket 준비 완료

**작업 내용**:
- WebSocketClient 클래스 생성
- 재연결 로직 (exponential backoff)
- Ping/Pong 하트비트
- useWebSocket 훅

---

### Task #13: Playwright E2E 테스트 🟡 MEDIUM (우선순위 상승)
**예상 시간**: 2일
**참고**: 백엔드 E2E 인프라 완성 (`../playground-backend/tests/e2e/`)

**작업 내용**:
- Playwright 설정 (백엔드 config 참고)
- 34개 테스트 케이스 작성
  - 인증 플로우 (7개)
  - 코드 실행 (8개)
  - 코드 공유 (7개)
  - 에러 처리 (12개)
- CI/CD 통합

**체크리스트**:
- [ ] `tests/e2e/playwright.config.ts` 생성 (백엔드 참고)
- [ ] 4개 테스트 스위트 작성
- [ ] 멀티브라우저 테스트 (Chromium, Firefox, WebKit)
- [ ] CI/CD 통합
- [ ] HTML 리포트 생성

---

### Task #10: 실행 히스토리 🟡 MEDIUM
**예상 시간**: 2일

**작업 내용**:
- localStorage 저장
- 히스토리 사이드바
- 검색/필터링
- 내보내기 (JSON)

---

### Task #11: 멀티 파일 에디터 🟡 MEDIUM
**예상 시간**: 3일

**작업 내용**:
- 파일 탭 컴포넌트
- 파일 트리 사이드바
- 드래그앤드롭 업로드

---

### Task #12: 출력 패널 개선 🟡 MEDIUM
**예상 시간**: 1일

**작업 내용**:
- 복사/다운로드 버튼
- 검색 기능
- ANSI 색상 코드 지원
- 자동 스크롤 토글

---

## Phase 6: 고급 프로토콜 (1주)

### Task #9: gRPC-Web 클라이언트 🟢 LOW
**예상 시간**: 3일
**참고**: 백엔드 gRPC 준비 완료

**작업 내용**:
- `grpc-web` 패키지 설치
- Protobuf 파일 생성
- TypeScript 코드 생성
- Envoy 프록시 설정 (백엔드 협업)

---

### Task #14: Monaco Editor 고급 기능 🟢 LOW
**예상 시간**: 2일

**작업 내용**:
- Kingsejong 언어 문법 정의
- 자동완성
- 코드 포매팅
- Go-to-Definition

---

### Task #18: 성능 최적화 🟢 LOW
**예상 시간**: 2일

**작업 내용**:
- Code splitting
- Lazy loading
- Bundle size 분석
- Lighthouse 점수 90+

---

## Phase 7: 품질 & 접근성 (1주)

### Task #15: PWA 지원 🟢 LOW
**예상 시간**: 1일

### Task #16: 다국어 지원 (i18n) 🟢 LOW
**예상 시간**: 2일

### Task #17: 접근성 개선 (a11y) 🟢 LOW
**예상 시간**: 2일

---

## 📊 진행률 추적

### 현재 (Phase 3 완료)
```
[████████████░░░░░░░░] 65% MVP 완료
```

### Phase 4 완료 시 (보안 & 품질)
```
[█████████████████░░░] 85% 프로덕션 레디
```

### 전체 완료 시
```
[████████████████████] 100% 완성
```

---

## 🎯 다음 액션 아이템 (우선순위 순)

### 이번 주 (Phase 4)
1. ⚡ **CSP 구현** (1일) - XSS 방어
2. ⚡ **Zod 검증** (2일) - 타입 안전성
3. 🔴 **Error Boundary** (0.5일) - 앱 안정성
4. 🔴 **커스텀 훅** (2일) - 코드 품질
5. 🔴 **테스트 인프라** (2일) - 80% 커버리지

### 다음 주 (Phase 5 시작)
6. 🟡 **E2E 테스트** (2일) - 백엔드 참고
7. 🟡 **Toast 시스템** (1일) - UX 개선
8. 🟡 **키보드 단축키** (1일) - 생산성
9. 🟡 **WebSocket** (2일) - 실시간 통신
10. 🟡 **실행 히스토리** (2일) - 사용자 편의성

---

## 🔗 참고 자료

### 백엔드 리소스 (100% 완료)
- **E2E 테스트**: `../playground-backend/tests/e2e/`
  - `playwright.config.ts` - 멀티브라우저 설정
  - `tests/auth.spec.ts` - 인증 테스트 (7개)
  - `tests/code-execution.spec.ts` - 실행 테스트 (8개)
  - `tests/code-sharing.spec.ts` - 공유 테스트 (7개)
  - `tests/error-scenarios.spec.ts` - 에러 테스트 (12개)
  - `README.md` - 상세 가이드

- **모니터링**: `../playground-backend/infrastructure/monitoring/`
  - Prometheus 설정
  - Grafana 대시보드
  - Alert rules

- **API 문서**: `../playground-backend/API_REFERENCE.md`

### 프론트엔드 문서
- **상세 TODO**: `./TODOLIST.md`
- **보안 설계**: `../docs-dev/FRONTEND_SECURITY_DESIGN.md`
- **프로토콜 설계**: `../docs-dev/FRONTEND_MULTI_PROTOCOL.md`

---

## 💡 핵심 포인트

### Phase 4가 가장 중요한 이유
1. **보안**: CSP, Zod 없이는 프로덕션 배포 불가
2. **안정성**: Error Boundary 없으면 사용자 경험 저하
3. **품질**: 테스트 없이는 유지보수 어려움
4. **리팩토링**: 523줄 page.tsx는 버그 온상

### 백엔드 완료의 이점
- API 안정적으로 동작 → 프론트엔드 개발 집중 가능
- E2E 테스트 인프라 완성 → 바로 참고하여 구축
- 모니터링 준비 → 프론트엔드 메트릭만 추가하면 됨
- WebSocket/gRPC 준비 → 클라이언트만 구현하면 됨

---

**생성일**: 2025-11-14
**버전**: 1.0
**상태**: 백엔드 100% 완료, 프론트엔드 Phase 4 준비
