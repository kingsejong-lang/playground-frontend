# Kingsejong Playground Frontend

Web-based code playground for writing, compiling, and running code in multiple languages.

## Features

- **Multi-language support**: Python, Go, Kingsejong
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Real-time execution**: Run code and see results instantly
- **Dark theme**: Easy on the eyes coding interface
- **Responsive design**: Works on all screen sizes

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

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main playground page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── CodeEditor.tsx     # Monaco editor wrapper
│   ├── LanguageSelector.tsx  # Language dropdown
│   └── OutputPanel.tsx    # Execution results display
└── lib/                   # Utilities
    └── api.ts             # API client for backend
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Integration

The frontend communicates with the Gateway service:

- `GET /api/v1/languages` - List available languages
- `GET /api/v1/languages/:id` - Get language details
- `POST /api/v1/execute` - Execute code
- `GET /api/v1/languages/:id/templates/:template` - Load templates

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Monaco Editor** - Code editor (VS Code's editor)
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Development

The playground automatically connects to the backend Gateway service. Make sure all backend services are running:

1. Language Service (port 50051)
2. Execution Service (port 50052)
3. Gateway Service (port 8080)

## License

MIT
