# Kingsejong Playground Frontend

Production-ready web-based code playground for writing, compiling, and running code with multi-protocol support, comprehensive testing, and enterprise-grade security.

## ✨ Features

### Core Features
- **Multi-language support**: Python 3.12, Go 1.22, Kingsejong v1.0
- **Monaco Editor**: Professional code editor with syntax highlighting and Kingsejong language support
- **Multi-file editing**: File tree, tabs, drag-and-drop support
- **Execution modes**:
  - REST API execution
  - Real-time SSE streaming
  - WebSocket with auto-reconnect
  - gRPC-Web protocol

### Security & Quality (Phase 4-7)
- **Content Security Policy (CSP)**: XSS attack prevention
- **Zod runtime validation**: Type-safe API requests/responses with Result pattern
- **Error boundaries**: Graceful error handling with fallback UI
- **163 tests**: 97.95% coverage (137 unit + 26 E2E tests)
- **JWT Authentication**: Secure login/signup

### User Experience
- **Toast notifications**: Success/error/warning/info alerts
- **Keyboard shortcuts**: 8 productivity shortcuts (Ctrl+Enter to run, etc.)
- **Execution history**: Persistent history with search/filter/export
- **Advanced output panel**:
  - ANSI color support
  - Search functionality
  - Copy/download buttons
  - Line numbers toggle
  - Auto-scroll control

### Code Sharing
- **Share functionality**: Generate shareable URLs
- **URL-based loading**: Load shared code via query parameters
- **One-click copy**: Automatic clipboard management

### Settings & Customization
- **Editor settings**: Font size/family, tab size, minimap, auto-save
- **Theme settings**: Dark/Light mode, color schemes
- **Persistent storage**: Settings saved to backend
- **Multi-language UI**: Korean/English support (i18n)

### Progressive Web App
- **PWA support**: Offline functionality
- **Service worker**: Automatic caching
- **App installation**: Install as native app

### Accessibility
- **WCAG 2.1 Level AA**: Full compliance
- **Screen reader support**: ARIA labels and roles
- **Keyboard navigation**: Complete keyboard accessibility
- **Focus indicators**: Clear visual feedback

### Performance
- **136 kB bundle**: Optimized bundle size (< 500 kB target)
- **Code splitting**: 6 heavy components lazy-loaded
- **Web Vitals tracking**: CLS, FCP, LCP, TTFB, INP monitoring
- **Image optimization**: AVIF/WebP support

## Getting Started

### Prerequisites

- Node.js 18+
- npm/pnpm/yarn
- Backend services running (Gateway at port 8080)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view the playground.

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

## 📁 Project Structure

```
src/
├── app/                          # Next.js app directory
│   ├── [locale]/                 # i18n routing (ko/en)
│   │   ├── layout.tsx           # Locale layout
│   │   ├── page.tsx             # Main playground (with code splitting)
│   │   ├── providers.tsx        # Context providers
│   │   └── web-vitals.ts        # Performance monitoring
│   └── globals.css              # Global Tailwind styles
├── components/                   # React components (15 total)
│   ├── CodeEditor.tsx           # Monaco editor
│   ├── OutputPanel.tsx          # Advanced output display
│   ├── SettingsModal.tsx        # User settings
│   ├── AuthModal.tsx            # Login/signup
│   ├── HistorySidebar.tsx       # Execution history
│   ├── FileTree.tsx             # File explorer
│   ├── FileTabs.tsx             # File tabs
│   ├── Toast.tsx                # Toast notifications
│   ├── ShortcutsHelp.tsx        # Keyboard shortcuts help
│   ├── ErrorBoundary.tsx        # Error handling
│   └── ...
├── hooks/                        # Custom React hooks (10 total)
│   ├── useCodeExecution.ts      # Execution logic (REST/SSE/WebSocket)
│   ├── useLanguages.ts          # Language management
│   ├── useSettings.ts           # Settings management
│   ├── useShare.ts              # Code sharing
│   ├── useHistory.ts            # Execution history
│   ├── useFiles.ts              # Multi-file support
│   ├── useSSE.ts                # SSE streaming
│   ├── useWebSocket.ts          # WebSocket client
│   ├── useKeyboardShortcut.ts   # Keyboard shortcuts
│   └── useToast.ts              # Toast notifications
├── contexts/                     # React contexts
│   ├── AuthContext.tsx          # Authentication
│   └── ToastContext.tsx         # Toast management
├── lib/                          # Utilities
│   ├── api.ts                   # REST API client
│   ├── api-client.ts            # Validated API client (Zod)
│   ├── grpc-client.ts           # gRPC-Web client
│   ├── websocket.ts             # WebSocket client
│   ├── sse-client.ts            # SSE client with auto-reconnect
│   ├── csp.ts                   # Content Security Policy
│   ├── ansi-parser.tsx          # ANSI color parsing
│   ├── history.ts               # History management
│   ├── schemas/                 # Zod schemas (5 files)
│   ├── types/                   # TypeScript types
│   ├── errors/                  # Error classes
│   └── monaco/                  # Monaco configuration
│       └── kingsejong-language.ts
├── i18n.ts                      # i18n configuration
├── middleware.ts                # Locale routing
└── __tests__/                   # Test files
    ├── components/              # Component tests
    ├── hooks/                   # Hook tests (137 tests)
    └── lib/                     # Utility tests

tests/e2e/                       # E2E tests (26 tests)
├── code-execution.spec.ts       # 7 tests
├── authentication.spec.ts       # 9 tests
└── code-sharing.spec.ts         # 10 tests
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run analyze` - Analyze bundle size
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - Run E2E tests in UI mode

## 🔌 API Integration

The frontend supports 4 communication protocols:

### REST API (Primary)
- `GET /api/v1/languages` - List languages
- `POST /api/v1/execute` - Execute code
- `POST /api/v1/share` - Create share
- `POST /api/v1/settings` - Save settings
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Server-Sent Events (SSE)
- `POST /api/v1/execute/stream` - Real-time execution streaming
- Auto-reconnect with exponential backoff
- Connection state management

### WebSocket
- `ws://localhost:8080/ws/execute` - Bidirectional real-time communication
- Automatic reconnection with jitter
- Ping/pong heartbeat (30s interval)
- Message protocol with request/response matching

### gRPC-Web
- 5 service clients: Language, Execution, Storage, Auth, Settings
- Protobuf → Zod schema conversion
- JWT authentication metadata injection
- Result pattern integration

## 🔧 Technologies

### Core
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS

### Editor & UI
- **Monaco Editor** - VS Code's editor
- **@monaco-editor/react** - React integration
- **react-error-boundary** - Error handling

### API & Protocols
- **Axios** - HTTP client
- **Fetch API + ReadableStream** - SSE streaming
- **WebSocket API** - Bidirectional communication
- **grpc-web** - gRPC protocol
- **Zod** - Runtime validation

### Testing
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **@testing-library/react-hooks** - Hook testing
- **Playwright** - E2E testing
- **MSW (Mock Service Worker)** - API mocking

### i18n & PWA
- **next-intl** - Internationalization
- **next-pwa** - Progressive Web App
- **web-vitals** - Performance monitoring

### Security
- **CSP** - Content Security Policy
- **JWT** - JSON Web Tokens

## 💻 Development

Ensure backend services are running:

```bash
cd ../playground-backend

# Run all services with Docker Compose
make run-dev

# Services:
# - Language Service (port 50051)
# - Execution Service (port 50052)
# - Storage Service (port 50053)
# - Auth Service (port 50054)
# - Settings Service (port 50055)
# - Gateway Service (port 8080)
```

## 📊 Implementation Status

### ✅ All Phases Complete (100%)

**Phase 1: Core Playground**
- ✅ Monaco Editor with syntax highlighting
- ✅ Language selector (Python, Go, Kingsejong)
- ✅ Template loading
- ✅ Code execution with metrics

**Phase 2-3: Code Sharing & Streaming**
- ✅ Share functionality with URLs
- ✅ SSE real-time streaming
- ✅ Progressive output display

**Phase 4: Security & Quality**
- ✅ Content Security Policy (6 headers)
- ✅ Zod runtime validation (Result pattern)
- ✅ Error boundaries
- ✅ Custom hooks refactoring (10 hooks)
- ✅ Test infrastructure (163 tests, 97.95% coverage)

**Phase 5: UX & Features**
- ✅ Toast notification system
- ✅ Keyboard shortcuts (8 shortcuts)
- ✅ Execution history with search/filter
- ✅ Multi-file editor (file tree + tabs)
- ✅ Advanced output panel (ANSI, search, copy/download)

**Phase 6: Advanced Protocols & Performance**
- ✅ WebSocket client (auto-reconnect, heartbeat)
- ✅ gRPC-Web client (5 services)
- ✅ SSE auto-reconnect
- ✅ Performance optimization (136 kB bundle)
- ✅ Code splitting (6 components)
- ✅ Web Vitals tracking

**Phase 7: Quality & Accessibility**
- ✅ Playwright E2E tests (26 tests)
- ✅ PWA support (offline, installable)
- ✅ i18n (Korean/English)
- ✅ Accessibility (WCAG 2.1 Level AA)

**Phase 8: Monaco Advanced Features** ✅
- ✅ Kingsejong syntax highlighting (43 keywords)
- ✅ Autocomplete (28+ snippets)
- ✅ Hover documentation (17 keywords)
- ✅ Custom theme (kingsejong-dark)
- ✅ Code formatting (3 providers)
- ✅ Advanced snippets (8 templates)

**Completed**: 2025-11-15

## 🔒 Security Features

- **Content Security Policy**: XSS attack prevention
- **CORS Protection**: Strict origin validation
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Zod runtime validation
- **Error Boundaries**: Graceful error handling
- **Secure Headers**: X-Frame-Options, X-Content-Type-Options, etc.

## 📈 Performance Metrics

- **Bundle Size**: 136 kB (target: < 500 kB) ✅
- **First Load JS**: 136 kB ✅
- **Code Splitting**: 6 components lazy-loaded ✅
- **Test Coverage**: 97.95% ✅
- **Lighthouse Score**: Optimized for 90+ (TBD)

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 Documentation

- `TODOLIST.md` - Detailed task list (1500+ lines)
- `PRIORITY_ROADMAP.md` - Priority roadmap (all phases complete)
- `docs/CSP_IMPLEMENTATION.md` - CSP implementation guide
- `docs/MONACO_IMPROVEMENTS.md` - Monaco Editor improvements
- `tests/e2e/README.md` - E2E testing guide

## 📄 License

MIT

---

**Version**: 3.0
**Status**: Production Ready (100% complete) ✅
**Last Updated**: 2025-11-15
**Made with ❤️ by Kingsejong Lang Team**
