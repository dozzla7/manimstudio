# Manim Studio

AI-powered educational video generator that creates Manim animations from natural language descriptions.

## Overview

Manim Studio transforms text prompts into mathematical visualizations in the style of 3Blue1Brown. Built with:

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Hono (Node.js), TypeScript
- **AI**: OpenRouter API (Claude 3.5 Sonnet / GPT-4o)
- **Rendering**: Manim (Python, Docker-isolated)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+ (for Manim rendering, coming soon)
- Docker (for isolated rendering, coming soon)

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

Or use the convenience script:

```bash
npm run install:all
```

### 2. Configure Environment

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Create a `.env` file in the `backend/` directory:

```env
OPENROUTER_API_KEY=your-openrouter-api-key-here
PORT=3001
```

Get your OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys).

### 3. Run Development Servers

**Option A: Run both simultaneously**

```bash
npm run dev:all
```

**Option B: Run separately**

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run dev:backend
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Project Structure

```
animation/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page with prompt input
│   ├── project/[id]/      # Project workspace (real-time status)
│   └── layout.tsx
│
├── components/
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Textarea.tsx
│       └── ...
│
├── lib/
│   ├── types.ts           # Shared TypeScript types
│   └── api.ts             # Frontend API client
│
├── backend/               # Hono API server
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/
│   │   │   ├── generate.ts
│   │   │   └── project.ts
│   │   └── services/
│   │       └── llm.ts     # OpenRouter integration
│   └── package.json
│
├── prompts/               # Prompt engineering assets
│   ├── system.md          # Prompt guidelines
│   └── scenes/            # Few-shot examples
│
└── workers/               # Python render workers (coming soon)
```

## API Endpoints

### POST /generate

Create a new video generation job.

```json
{
  "prompt": "Explain derivatives visually...",
  "options": {
    "style": "3blue1brown",
    "quality": "low",
    "duration": 60
  }
}
```

Response:
```json
{
  "projectId": "abc123def456",
  "message": "Video generation started..."
}
```

### GET /project/:id

Get project status and progress.

Response:
```json
{
  "project": {
    "id": "abc123def456",
    "status": "rendering",
    "scenes": [...]
  },
  "progress": {
    "total": 5,
    "completed": 2,
    "current": "Scene 3: Tangent Line"
  }
}
```

## Architecture

```
User Prompt
    ↓
Next.js Frontend
    ↓
POST /generate → Hono API
    ↓
Planner LLM → Storyboard (scene breakdown)
    ↓
Scene LLM × N → Manim code for each scene
    ↓
(Docker) Python Worker → Render MP4
    ↓
Frontend displays via SSE/polling
```

## Roadmap

- [x] Landing page with prompt input
- [x] Project workspace with real-time status
- [x] Hono backend with LLM integration
- [ ] Docker-isolated Manim rendering
- [ ] Redis + BullMQ for job queues
- [ ] PostgreSQL for persistence
- [ ] SSE for real-time updates
- [ ] Scene preview thumbnails
- [ ] Video composition and export
- [ ] User authentication
- [ ] Project history and management

## Development Notes

### LLM Strategy

- **Storyboard**: Uses temperature 0.8 for creative scene breakdowns
- **Code Generation**: Uses temperature 0.7 for accurate Manim code
- **Model**: Claude 3.5 Sonnet (via OpenRouter) is best for code generation

### Adding New Few-Shot Examples

Add `.py` files to `prompts/scenes/` with well-documented Manim code. These are used to improve code generation quality.

## License

MIT
