# Kingsejong Playground Frontend

Web-based code playground for writing, compiling, and running code in multiple languages with real-time streaming, code sharing, and persistent user settings.

## ✨ Features

### Core Features
- **Multi-language support**: Python 3.12, Go 1.22, Kingsejong v1.0
- **Monaco Editor**: Professional code editor with syntax highlighting and customization
- **Dual execution modes**:
  - Regular execution with complete results
  - Real-time streaming execution with live output (SSE)
- **Template loading**: Quick start with Hello World templates for each language

### Code Sharing (Phase 2-3)
- **Share functionality**: Generate shareable URLs for your code
- **URL-based loading**: Load shared code via query parameters (`?share=xxx`)
- **One-click copy**: Automatic clipboard copy of share URLs
- **Share modal**: User-friendly share URL display and management

### User Settings (Phase 2-4)
- **Editor settings**:
  - Font size (10-24px)
  - Font family (Fira Code, Monaco, Consolas, Source Code Pro)
  - Tab size (2-8 spaces)
  - Auto-save toggle
  - Minimap toggle
- **Theme settings**:
  - Theme mode (Dark/Light)
  - Color schemes (vs-dark, vs-light, hc-black)
- **Persistent storage**: Settings saved to backend and restored on reload
- **Anonymous user ID**: localStorage-based user identification

### Real-time Streaming (Phase 3)
- **SSE streaming**: Server-sent events for live execution updates
- **Event display**: Real-time output with timestamps and event types
- **Dual run buttons**: Choose between regular or streaming execution
- **Progressive output**: See compilation and runtime output as it happens

### UI/UX
- **Dark theme**: Professional dark mode interface
- **Responsive design**: Optimized for all screen sizes
- **Split-panel layout**: Side-by-side editor and output
- **Metrics display**: Compilation time, runtime, memory usage
- **Error handling**: Clear error messages and states

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm/npm/yarn
- Backend services running (Gateway, Language, Execution)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the playground.

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 📁 Project Structure

```
src/
├── app/                       # Next.js app directory
│   ├── layout.tsx            # Root layout with metadata
│   ├── page.tsx              # Main playground page (all features)
│   └── globals.css           # Global Tailwind styles
├── components/               # React components
│   ├── CodeEditor.tsx        # Monaco editor with customization
│   ├── LanguageSelector.tsx  # Language dropdown selector
│   ├── OutputPanel.tsx       # Execution results + streaming events
│   └── SettingsModal.tsx     # User settings UI (NEW)
└── lib/                      # Utilities
    └── api.ts                # API client (Language, Execution, Share, Settings)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔌 API Integration

The frontend communicates with the Gateway service (REST API):

### Language Service
- `GET /api/v1/languages` - List available languages
- `GET /api/v1/languages/:id` - Get language details
- `GET /api/v1/languages/:id/templates/:template` - Load code templates

### Execution Service
- `POST /api/v1/execute` - Execute code (regular mode)
- `POST /api/v1/execute/stream` - Execute code with SSE streaming
- `DELETE /api/v1/execute/:id` - Cancel execution
- `GET /api/v1/execute/:id/status` - Get execution status

### Storage Service
- `POST /api/v1/share` - Create code share
- `GET /api/v1/share/:id` - Get shared code
- `DELETE /api/v1/share/:id` - Delete share
- `POST /api/v1/settings` - Save user settings
- `GET /api/v1/settings/:userId` - Get user settings

## 🔧 Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better DX
- **React 18** - UI library with hooks
- **Monaco Editor** - Professional code editor (VS Code's editor)
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **Fetch API + ReadableStream** - SSE streaming implementation

## 💻 Development

The playground automatically connects to the backend Gateway service. Make sure all backend services are running:

1. **Language Service** (port 50051) - Language metadata
2. **Execution Service** (port 50052) - Code execution with Docker
3. **Storage Service** (port 50053) - Code sharing and settings
4. **Gateway Service** (port 8080) - REST API gateway

### Running Backend Services

```bash
cd ../playground-backend

# Option 1: Run all services with Docker Compose
make run-dev

# Option 2: Run services individually
./bin/language &
GRPC_PORT=50052 ./bin/execution &
GRPC_PORT=50053 ./bin/storage &
./bin/gateway &
```

## 📊 Implementation Status

### ✅ All MVP Features Complete!

**Phase 1: Core Playground**
- ✅ Monaco Editor integration with syntax highlighting
- ✅ Language selector (Python, Go, Kingsejong)
- ✅ Template loading (Hello World examples)
- ✅ Code execution with output display
- ✅ Error handling and metrics display
- ✅ Dark theme UI with Tailwind CSS

**Phase 2-3: Code Sharing**
- ✅ Share button with URL generation
- ✅ Short URL-safe share IDs
- ✅ Share modal with clipboard copy
- ✅ URL query parameter loading (`?share=xxx`)
- ✅ Integration with Storage Service API

**Phase 2-4: User Settings**
- ✅ Settings modal UI
- ✅ Editor customization (font size, family, tab size, minimap)
- ✅ Theme customization (dark/light, color schemes)
- ✅ Persistent settings storage
- ✅ localStorage-based anonymous user ID
- ✅ Auto-load settings on page load

**Phase 3: Real-time Streaming**
- ✅ "Run (Stream)" button for SSE execution
- ✅ Fetch API + ReadableStream implementation
- ✅ Real-time event parsing and display
- ✅ Progressive output with timestamps
- ✅ Event type indicators (compile, stdout, stderr)
- ✅ Dual execution modes (regular + streaming)

### 🎯 Optional Future Enhancements

⏳ **Authentication**
- User login/signup
- OAuth integration (GitHub, Google)
- Personal code library

⏳ **Collaboration**
- Real-time collaborative editing
- Code comments and annotations
- Share with specific users

⏳ **Additional Features**
- More languages support
- Code auto-save
- Execution history
- Code snippets library
- Mobile app (React Native)

## 📄 License

MIT

---

**Made with ❤️ by Kingsejong Lang Team**
