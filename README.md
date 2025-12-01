# Kingsejong Playground

웹 기반 코드 플레이그라운드 - Python, Go, Kingsejong 언어를 작성하고 실행할 수 있습니다.

## 주요 기능

### 코드 편집기
- **다중 언어 지원**: Python 3.12, Go 1.22, Kingsejong v1.0
- **Monaco Editor**: VS Code와 동일한 전문 코드 편집기
- **다중 파일 편집**: 파일 트리, 탭, 드래그 앤 드롭 지원
- **실시간 스트리밍**: 코드 실행 결과를 실시간으로 확인

### 사용자 경험
- **키보드 단축키**: `Ctrl+Enter` 실행, `Ctrl+S` 저장 등 8개 단축키
- **실행 기록**: 검색/필터/내보내기 지원
- **출력 패널**: ANSI 컬러, 검색, 복사/다운로드
- **알림 시스템**: 성공/오류/경고 토스트 알림

### 코드 공유
- **공유 URL 생성**: 코드를 URL로 공유
- **원클릭 복사**: 클립보드 자동 복사

### 설정
- **에디터 설정**: 폰트 크기, 탭 크기, 미니맵, 자동 저장
- **테마 설정**: 다크/라이트 모드
- **다국어 지원**: 한국어/영어

### 접근성
- **WCAG 2.1 Level AA**: 웹 접근성 준수
- **키보드 네비게이션**: 완전한 키보드 접근성
- **스크린 리더 지원**: ARIA 레이블 및 역할

## 시작하기

### 요구 사항

- Node.js 18+
- npm/pnpm/yarn
- 백엔드 서비스 (Gateway: port 8080)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm run start
```

[http://localhost:3000](http://localhost:3000)에서 플레이그라운드를 사용할 수 있습니다.

### 환경 변수

`.env.local` 파일 생성:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl + Enter` | 코드 실행 |
| `Ctrl + S` | 코드 저장 |
| `Ctrl + Shift + S` | 코드 공유 |
| `Ctrl + ,` | 설정 열기 |
| `Ctrl + H` | 실행 기록 |
| `Ctrl + /` | 주석 토글 |
| `Ctrl + L` | 줄 삭제 |
| `F1` | 명령 팔레트 |

## 지원 브라우저

- Chrome/Edge (최신)
- Firefox (최신)
- Safari (최신)
- 모바일 브라우저 (iOS Safari, Chrome Mobile)

## 라이선스

MIT

---
