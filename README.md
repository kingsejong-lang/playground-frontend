# Kingsejong Playground

웹 기반 코드 플레이그라운드 - Python, Go, Kingsejong 언어를 작성하고 실행할 수 있습니다.

## 주요 기능

### 코드 편집기
- **다중 언어 지원**: Python 3.12, Go 1.22, Kingsejong v1.0
- **Monaco Editor**: VS Code와 동일한 전문 코드 편집기
- **다중 파일 편집과 실행**: 파일 트리와 탭, 모든 파일을 보내고 진입 파일부터 실행
- **실시간 스트리밍**: 코드 실행 결과를 실시간으로 확인 (`ExecutionService.Run` 서버 스트림, 실행 중 중지 가능)

### 사용자 경험
- **키보드 단축키**: `Ctrl+Enter`(macOS 는 `⌘+Enter`) 실행, `Ctrl+.` 중지, `Ctrl+S` 임시 저장, `?` 도움말. 나머지는 메뉴와 명령 팔레트(`F1`)
- **실행 기록**: 검색/필터/내보내기 지원
- **출력 패널**: ANSI 컬러, 검색, 복사/다운로드
- **알림 시스템**: 성공/오류/경고 토스트 알림

### 코드 공유
- **공유 URL 생성**: 코드를 URL로 공유
- **원클릭 복사**: 클립보드 자동 복사

### 설정
- **에디터 설정**: 폰트 크기, 탭 크기, 미니맵, 자동 저장(이 브라우저에 임시 저장)
- **테마 설정**: 다크/라이트 모드
- **다국어 지원**: 한국어/영어

### 접근성
- **WCAG 2.2 Level AA**: 두 테마 모두 대비 4.5:1 이상, 최소 24px 터치 영역, 동작 줄이기 설정 존중
- **키보드 네비게이션**: 완전한 키보드 접근성
- **스크린 리더 지원**: ARIA 레이블 및 역할

## 시작하기

### 요구 사항

- Node.js 26 LTS (`>=26.12.1`, `.nvmrc` 참고) / npm 11
- 백엔드 Gateway (Connect 프로토콜, 기본 `http://localhost:8080`)
- 공유 계약 저장소 [`playground-proto`](../playground-proto) 가 이 저장소 옆 디렉터리에 있어야 합니다
  (`package.json` 이 `../playground-proto/ts/kingsejong-lang-playground-proto-0.3.0.tgz` 를 설치합니다)

### 설치 및 실행

```bash
nvm use               # Node 26
npm ci                # 의존성 설치 (lockfile 그대로)

npm run dev           # 개발 서버 (Turbopack)
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버
```

[http://localhost:3000](http://localhost:3000)에서 플레이그라운드를 사용할 수 있습니다 (`/ko` 또는 `/en` 으로 이동).
백엔드가 꺼져 있어도 페이지는 열리며, 출력 패널에 "server is unavailable" 메시지를 보여 줍니다.

### 환경 변수

`.env.local` 파일 생성:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | Connect Gateway 의 origin. 빌드 시점에 번들에 들어가며, CSP `connect-src` 에도 이 origin 만 허용됩니다 |
| `NEXT_PUBLIC_RPC_FAKE` | `1` 이면 **개발 서버(`npm run dev`)에서만** 백엔드 대신 가짜 RPC 전송(`src/lib/rpc/fake.ts`)을 씁니다. 프로덕션 빌드에서는 켤 수 없습니다 (아래 참고) |

### 백엔드 없이 UI 작업하기 (가짜 RPC 전송)

```bash
NEXT_PUBLIC_RPC_FAKE=1 npm run dev
# http://localhost:3000/ko                     정상 실행
# http://localhost:3000/ko?fake=compile_error  실패 상황 재현
```

`src/lib/rpc/fake.ts` 가 `createRouterTransport` 로 다섯 서비스를 흉내 냅니다. 언어 3개(킹세종/Python/Go,
Go 는 `defaultTemplateId` 가 비어 있어 `hello_world` 대체 경로를 탑니다), 템플릿, 공유, 로그인, 설정, 그리고
Accepted → Queued → Started → Output/Diagnostic → Finished 를 실제와 비슷한 지연으로 보내는 `Run` 스트림이 있습니다.

| `?fake=` 값 | 재현하는 상황 |
|---|---|
| (없음) | 성공. 코드의 `출력(...)`/`print(...)`/`fmt.Println(...)` 문자열을 출력 |
| `compile_error` | 진단 2개(오류 `main.ksj:2:1`, 경고 `main.ksj:6:1`) + `COMPILE_ERROR` |
| `runtime_error` | stderr + 종료 코드 1 (`FAILED`) |
| `timeout` / `memory` / `output_limit` | 시간/메모리/출력 제한 초과 (출력 제한은 `Truncated` 포함) |
| `queued` | 대기열 3 → 2 → 1 후 실행 |
| `slow` | 끝나지 않는 실행 (중지 버튼 확인용) |
| `drop` | Accepted 뒤 연결이 끊김 → `GetExecution` 재연결 |
| `internal` | `INTERNAL_ERROR` |
| `overloaded` / `rate_limited` | `ResourceExhausted` + `ErrorDetail` (재시도 시간 포함) |
| `unavailable` | 모든 RPC 가 네트워크 오류 (백엔드 꺼짐 상태) |
| `languages_error` / `no_templates` | 언어 목록 실패 / 템플릿 없음 |
| `slow_boot` | 언어 목록이 4초 늦게 와서 첫 로딩 화면을 볼 수 있음 |

`?fake_user=1` 을 붙이면 로그인한 상태로 시작합니다. 임베드 화면은 `/ko/embed/AbCdEfGh1234`
(없는 공유는 `/ko/embed/notfound00`)에서 볼 수 있습니다.

**프로덕션에서 켤 수 없는 이유**: `src/lib/rpc/context.tsx` 는
`process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_RPC_FAKE === '1'` 일 때만
`import('./fake')` 를 부릅니다. 두 값 모두 빌드 시점에 상수로 바뀌고 `next build` 에서는 `NODE_ENV` 가 항상
`production` 이므로 조건이 `false` 로 접히고, 가짜 모듈은 번들에 들어가지 않습니다
(`grep -r createFakeTransport .next/static` 결과가 비어 있어야 합니다).

### 스크립트

| 명령 | 내용 |
|------|------|
| `npm run dev` | Next.js 개발 서버 |
| `npm run build` / `npm run start` | 프로덕션 빌드 / 실행 |
| `npm run typecheck` | `tsc --noEmit` (TypeScript 6.0.3) |
| `npm run lint` | ESLint 10 (flat config, `eslint.config.mjs`) |
| `npm test` | Vitest 단위 테스트 (`createRouterTransport` 로 만든 가짜 백엔드 사용) |
| `npm run test:e2e` | Playwright 스모크 테스트 (백엔드 없이 실행) |
| `npm run verify` | typecheck + lint + test + build |
| `npm run analyze` | 번들 분석 (`next build --webpack`) |

### 구조

- `src/lib/rpc/` — 유일한 네트워크 계층. Connect 클라이언트(바이너리 protobuf, 쿠키 인증), 오류 매핑(`ErrorDetail`), 요청 사전 검증(protovalidate), `Run` 스트림 처리
- `src/features/{editor,execution,share,auth,settings}/` — 기능별 훅과 컴포넌트
- `src/proxy.ts` — 로케일 라우팅(next-intl)과 요청마다 nonce 를 넣는 CSP
- `src/components/ui/` — 버튼, 대화 상자(`<dialog>`), 키캡 등 공용 UI. 디자인 토큰은 `src/app/globals.css`
- 화면 문구는 모두 `messages/{ko,en}.json` 에 있습니다. 제품/디자인 기준: `PRODUCT.md`, `DESIGN.md`
- 설계 문서: `docs/refactoring/REFACTORING_DESIGN.md`, 명세: `docs/specs/`

proto 패키지는 현재 로컬 tarball 로 설치합니다. 레지스트리에 `@kingsejong-lang/playground-proto` 가 게시되면
`package.json` 의 의존성을 정확한 버전(예: `"0.3.0"`)으로 바꾸고 `npm install` 로 lockfile 을 갱신합니다.

## 키보드 단축키

브라우저·OS 단축키(`Ctrl/⌘+T`, `L`, `H`, `F`, `S` 등)와 겹치지 않도록 전역 단축키는 네 개만 둡니다
(`src/features/editor/shortcuts.ts`). macOS 에서는 `Ctrl` 대신 `⌘` 입니다.

| 단축키 | 기능 |
|--------|------|
| `Ctrl + Enter` | 코드 실행 (모든 파일을 보내고 진입 파일부터 실행) |
| `Ctrl + .` | 실행 중지. `Esc` 는 대화 상자·자동 완성·찾기 닫기에 이미 쓰이므로 쓰지 않습니다 |
| `Ctrl + S` | 이 브라우저에 임시 저장 (네트워크 사용 없음, 공유하지 않음) |
| `?` | 단축키 도움말 (편집기·입력창 밖에서) |

템플릿, 스니펫, 실행 기록, 설정, 공유, 코드 정리, 배치·테마 전환, 출력 지우기는 헤더의 ☰ 메뉴와
편집기 명령 팔레트(`F1`)에 있습니다. 편집기에서 `Tab` 은 들여쓰기이므로, 키보드로 편집기 밖으로 나가려면
`Ctrl + M`(macOS 는 `Ctrl + Shift + M`)으로 Tab 이동 모드를 켭니다.

## 여러 파일 실행과 임시 저장

- **실행**: 열린 파일을 모두 보내고 진입 파일(`entry_file`)부터 실행합니다. 진입 파일은 직접 고른 파일,
  없으면 언어의 `defaultEntryFile`(파일 중에 있을 때), 그것도 없으면 첫 파일입니다
  (`src/features/editor/entry.ts`). 진입 파일은 탭·파일 목록에서 ▶ 표시로 보이고, 오른쪽 클릭 메뉴나
  파일 목록의 ▶ 버튼으로 바꿉니다. 편집기 명령 "이 파일을 진입 파일로 실행"은 그 실행에만 현재 파일을
  진입 파일로 씁니다. 공유와 임베드도 같은 규칙을 씁니다.
- **임시 저장**: `Ctrl + S` 는 파일 목록, 진입 파일, 열린 파일을 언어별로 `localStorage` 에 저장합니다
  (`kingsejong-draft:<언어 id>`). 설정의 "자동 저장"을 켜면 편집을 멈추고 1초 뒤 자동으로 저장합니다.
  다음에 같은 언어로 열면 저장본을 불러오고, 언어를 바꿀 때 그 언어의 저장본이 있으면 지금 작업을 원래
  언어의 저장본으로 남긴 뒤 바꿉니다. 로그인하지 않은 방문자의 편집기 설정도 이 브라우저에 저장됩니다.

## 지원 브라우저

- Chrome/Edge (최신)
- Firefox (최신)
- Safari (최신)
- 모바일 브라우저 (iOS Safari, Chrome Mobile)

## 라이선스

MIT

---
