# shout.mn

A public-interest investigative relationship intelligence platform that visualizes documented connections between politicians, companies, government agencies, procurement contracts, and other public-interest entities.

**Transparency through evidence.** Every relationship is sourced. Every claim is documented. Nothing on this platform implies wrongdoing.

> ⚠️ This repository contains entirely fictional sample data for demonstration purposes.

## Features

- **Interactive graph** — Sigma.js + Graphology visualization with zoom, pan, node/edge selection, and neighborhood highlighting
- **Entity pages** — Full profiles with relationships, evidence, sources, and export
- **Relationship pages** — Detailed views with evidence, source attribution, confidence scores
- **Source pages** — Full source metadata with evidence snippets and cross-references
- **Investigation pages** — Narrative reports combining storytelling with data
- **Connection path finder** — Find shortest documented path between any two entities
- **Client-side search** — MiniSearch fuzzy search across entities, relationships, and sources
- **Change tracking** — Chronological feed of dataset updates
- **Dark mode** — Full dark/light mode toggle, persisted to localStorage
- **100% static** — No backend, no database, no authentication

## Tech Stack

React 19 · TypeScript · Vite 8 · React Compiler · TanStack Router · TanStack Query · Zustand · Tailwind CSS v4 · Sigma.js · Graphology · MiniSearch · Lucide React · Motion

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run validate:data` | Validate all JSON data files |
| `npm run preview` | Preview production build |

## Adding Data

All data lives in `public/data/`. Edit the JSON files and run `npm run validate:data` to check integrity.

See [docs/editor-guide.md](docs/editor-guide.md) for step-by-step instructions.

## Deployment (GitHub Pages)

1. Push to a GitHub repository
2. Go to **Settings → Pages → Source → GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` deploys automatically on push to `main`

For a custom base path, set `VITE_BASE_PATH` in the workflow environment.

## Documentation

- [Data Schema](docs/data-schema.md)
- [Editor Guide](docs/editor-guide.md)
- [Editorial Policy](docs/editorial-policy.md)
- [Deployment](docs/deployment.md)
- [Architecture](docs/architecture.md)
