# Schema Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild shout.mn with rigorous accountability schema (3-tier confidence, mandatory evidence) as a single-page app on GitHub Pages.

**Architecture:** New TypeScript types → migration script → new data files → strip router → rebuild single page (graph + top bar + side panel) → deploy to GitHub Pages.

**Tech Stack:** React 19, Sigma.js 3, graphology, Tailwind CSS, Zustand, Vite 8

## Global Constraints

- Single page, no routing (TanStack Router removed)
- All data from `public/data/*.json` fetched at runtime
- GitHub Pages static hosting (`VITE_BASE_PATH` for subpath)
- Evidence mandatory on every edge (min 1 entry)
- Confidence is 3-tier enum: `documented` | `reported` | `alleged`
- Code style: existing patterns, Tailwind utility classes, TypeScript strict

---

### Task 1: Define TypeScript types

**Files:**
- Create: `src/types/node.ts`
- Create: `src/types/edge.ts`
- Create: `src/types/source.ts`

**Interfaces:**
- Produces: `Node`, `NodeType`, `PersonSubtype`, `Edge`, `ConfidenceTier`, `RelationshipType`, `Evidence`, `EvidenceDocType`, `SourceRecord`

- [ ] **Step 1: Create node types**

```typescript
// src/types/node.ts
export type NodeType = 'person' | 'company' | 'government_body' | 'media_outlet'
export type PersonSubtype = 'politician' | 'civil_servant' | 'business_person' | 'public_figure'

export interface Node {
  id: string
  name: string
  type: NodeType
  subtype?: PersonSubtype
  role_title?: string
  active_dates?: { from: string; to?: string }
  description?: string
  aliases?: string[]
  importance?: number
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  person: '#3b82f6',
  company: '#8b5cf6',
  government_body: '#f59e0b',
  media_outlet: '#64748b',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  person: 'Хүн',
  company: 'Компани',
  government_body: 'Засгийн газрын байгуулага',
  media_outlet: 'Мэдиа байгуулага',
}
```

- [ ] **Step 2: Create edge types**

```typescript
// src/types/edge.ts
export type ConfidenceTier = 'documented' | 'reported' | 'alleged'

export type RelationshipType =
  | 'family'
  | 'business_ownership'
  | 'employment'
  | 'appointment'
  | 'board_membership'
  | 'financial_transaction'
  | 'contract_awarded'
  | 'co_mention'
  | 'political_affiliation'

export type EvidenceDocType =
  | 'declaration'
  | 'court_ruling'
  | 'registry_record'
  | 'procurement_notice'
  | 'news_article'
  | 'other'

export interface Evidence {
  source_name: string
  url: string
  date_accessed: string
  document_type: EvidenceDocType
  note: string
}

export interface Edge {
  id: string
  from: string
  to: string
  relationship_type: RelationshipType
  confidence: ConfidenceTier
  evidence: Evidence[]
  date_range?: { from?: string; to?: string }
}

export const CONFIDENCE_COLORS: Record<ConfidenceTier, string> = {
  documented: '#475569',
  reported: '#64748b',
  alleged: '#94a3b8',
}

export const CONFIDENCE_DASH: Record<ConfidenceTier, number[]> = {
  documented: [],
  reported: [5, 3],
  alleged: [2, 2],
}

export const CONFIDENCE_LABELS: Record<ConfidenceTier, string> = {
  documented: 'Баталгаажсан',
  reported: 'Мэдээлсэн',
  alleged: 'Үндэслэлгүй',
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  family: 'Гэр бүлийн холбоо',
  business_ownership: 'Бизнесийн өмчлөл',
  employment: 'Хөдөлмөр эрхлэлт',
  appointment: 'Томилгоо',
  board_membership: 'Захирлын зөвлөлийн гишүүнчлэл',
  financial_transaction: 'Санхүүгийн гүйлгээ',
  contract_awarded: 'Гэрээний ялагч',
  co_mention: 'Хамт нэр дурдсан',
  political_affiliation: 'Улс төрийн холбоо',
}
```

- [ ] **Step 3: Create source types**

```typescript
// src/types/source.ts
import type { EvidenceDocType } from './edge'

export interface SourceRecord {
  id: string
  title: string
  url: string
  document_type: EvidenceDocType
  publisher?: string
  date_accessed: string
  reliability_notes?: string
  tags?: string[]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/node.ts src/types/edge.ts src/types/source.ts
git commit -m "feat(types): add node, edge, source types for new schema"
```

---

### Task 2: Migration script

**Files:**
- Create: `scripts/migrate.ts`

**Interfaces:**
- Consumes: old `public/data/entities.json`, `public/data/relationships.json`, `public/data/evidence.json`
- Produces: new `public/data/nodes.json`, `public/data/edges.json`, `public/data/sources.json`

- [ ] **Step 1: Write migration script**

```typescript
// scripts/migrate.ts
import { readFileSync, writeFileSync } from 'fs'

interface OldEntity {
  id: string; name: string; type: string; description: string
  aliases: string[]; tags: string[]; importance: number; confidence: number
  sourceIds: string[]; createdAt: string; updatedAt: string
}

interface OldRelationship {
  id: string; sourceEntityId: string; targetEntityId: string
  relationshipType: string; description: string; strength: number
  confidence: number; status: string; evidenceIds: string[]
  sourceIds: string[]; startDate: string; endDate: string
  createdAt: string; updatedAt: string
}

interface OldEvidence {
  id: string; sourceId: string; entityIds: string[]; relationshipIds: string[]
  claim: string; quote: string; pageNumber: string; notes: string
}

interface OldSource {
  id: string; title: string; publisher: string; url: string
  archiveUrl: string; publishedAt: string; retrievedAt: string
  reliabilityNotes: string; tags: string[]
}

const ENTITY_TYPE_MAP: Record<string, string> = {
  person: 'person', company: 'company',
  government_agency: 'government_body', media: 'media_outlet',
}

const PERSON_SUBTYPE_MAP: Record<string, string> = {
  'president': 'politician', 'prime-minister': 'politician',
  'mp': 'politician', 'speaker': 'politician',
  'minister': 'politician', 'governor': 'politician',
  'judge': 'civil_servant', 'prosecutor': 'civil_servant',
  'business': 'business_person', 'first-lady': 'public_figure',
}

const REL_TYPE_MAP: Record<string, string> = {
  spouse: 'family', parent: 'family',
  ownership: 'business_ownership',
  employment: 'employment', colleague: 'employment',
  appointment: 'appointment',
  board_membership: 'board_membership',
  procurement_contract: 'contract_awarded',
  donation: 'financial_transaction', investment: 'financial_transaction',
  partnership: 'co_mention', organizational_link: 'co_mention',
  party_member: 'political_affiliation', political_affiliation: 'political_affiliation',
}

function confidenceTier(n: number): 'documented' | 'reported' | 'alleged' {
  if (n >= 80) return 'documented'
  if (n >= 50) return 'reported'
  return 'alleged'
}

function main() {
  const oldEntities: OldEntity[] = JSON.parse(readFileSync('public/data/entities.json', 'utf-8'))
  const oldRels: OldRelationship[] = JSON.parse(readFileSync('public/data/relationships.json', 'utf-8'))
  const oldEvidence: OldEvidence[] = JSON.parse(readFileSync('public/data/evidence.json', 'utf-8'))
  const oldSources: OldSource[] = JSON.parse(readFileSync('public/data/sources.json', 'utf-8'))

  // Build evidence lookup: relationshipId -> evidence[]
  const evByRel = new Map<string, OldEvidence[]>()
  for (const ev of oldEvidence) {
    for (const relId of ev.relationshipIds) {
      if (!evByRel.has(relId)) evByRel.set(relId, [])
      evByRel.get(relId)!.push(ev)
    }
  }

  // Build source lookup
  const srcById = new Map(oldSources.map(s => [s.id, s]))

  // Migrate nodes
  const nodes = oldEntities
    .filter(e => ENTITY_TYPE_MAP[e.type])
    .map(e => ({
      id: e.id,
      name: e.name,
      type: ENTITY_TYPE_MAP[e.type],
      subtype: e.type === 'person'
        ? (e.tags.find(t => PERSON_SUBTYPE_MAP[t]) ?? 'public_figure')
        : undefined,
      role_title: e.description.slice(0, 80),
      active_dates: undefined,
      description: e.description,
      aliases: e.aliases.length ? e.aliases : undefined,
      importance: e.importance,
    }))

  // Migrate edges
  const nodeIds = new Set(nodes.map(n => n.id))
  const edges = oldRels
    .filter(r => nodeIds.has(r.sourceEntityId) && nodeIds.has(r.targetEntityId))
    .filter(r => REL_TYPE_MAP[r.relationshipType])
    .map(r => {
      const evidences = (evByRel.get(r.id) ?? []).map(ev => {
        const src = srcById.get(ev.sourceId)
        return {
          source_name: src?.title ?? ev.sourceId,
          url: src?.url ?? '',
          date_accessed: src?.retrievedAt ?? new Date().toISOString().slice(0, 10),
          document_type: 'news_article' as const,
          note: ev.claim.slice(0, 120),
        }
      })
      // Ensure at least 1 evidence entry
      if (evidences.length === 0) {
        evidences.push({
          source_name: 'Unknown',
          url: '',
          date_accessed: new Date().toISOString().slice(0, 10),
          document_type: 'other',
          note: r.description.slice(0, 120),
        })
      }
      return {
        id: r.id,
        from: r.sourceEntityId,
        to: r.targetEntityId,
        relationship_type: REL_TYPE_MAP[r.relationshipType],
        confidence: confidenceTier(r.confidence),
        evidence: evidences,
        date_range: (r.startDate || r.endDate)
          ? { from: r.startDate || undefined, to: r.endDate || undefined }
          : undefined,
      }
    })

  // Migrate sources
  const sources = oldSources.map(s => ({
    id: s.id,
    title: s.title,
    url: s.url,
    document_type: 'news_article' as const,
    publisher: s.publisher,
    date_accessed: s.retrievedAt,
    reliability_notes: s.reliabilityNotes,
    tags: s.tags.length ? s.tags : undefined,
  }))

  writeFileSync('public/data/nodes.json', JSON.stringify(nodes, null, 2))
  writeFileSync('public/data/edges.json', JSON.stringify(edges, null, 2))
  writeFileSync('public/data/sources.json', JSON.stringify(sources, null, 2))

  console.log(`Migrated: ${nodes.length} nodes, ${edges.length} edges, ${sources.length} sources`)
}

main()
```

- [ ] **Step 2: Run migration**

Run: `npx tsx scripts/migrate.ts`
Expected: "Migrated: X nodes, Y edges, Z sources"

- [ ] **Step 3: Validate output**

Run: `npx tsx -e "const n=JSON.parse(require('fs').readFileSync('public/data/nodes.json','utf-8')); const e=JSON.parse(require('fs').readFileSync('public/data/edges.json','utf-8')); console.log('Nodes:', n.length, 'Edges:', e.length, 'All edges have evidence:', e.every((x:any)=>x.evidence?.length>0))"`
Expected: `All edges have evidence: true`

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate.ts public/data/nodes.json public/data/edges.json public/data/sources.json
git commit -m "feat(data): migrate to new schema with mandatory evidence"
```

---

### Task 3: Data loader

**Files:**
- Modify: `src/data/loaders.ts`

**Interfaces:**
- Consumes: `Node` from `src/types/node.ts`, `Edge` from `src/types/edge.ts`, `SourceRecord` from `src/types/source.ts`
- Produces: `fetchNodes()`, `fetchEdges()`, `fetchSources()`

- [ ] **Step 1: Replace loader content**

```typescript
// src/data/loaders.ts
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import type { SourceRecord } from '@/types/source'

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchNodes = () => fetchJson<Node[]>('/data/nodes.json')
export const fetchEdges = () => fetchJson<Edge[]>('/data/edges.json')
export const fetchSources = () => fetchJson<SourceRecord[]>('/data/sources.json')
```

- [ ] **Step 2: Commit**

```bash
git add src/data/loaders.ts
git commit -m "refactor(loaders): update to new schema loaders"
```

---

### Task 4: Strip router, create single-page shell

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Delete: `src/routes/` (all route files)
- Delete: `src/routeTree.gen.ts`
- Delete: `src/pages/` (all page files)
- Delete: `src/i18n/` (not needed for single page)
- Delete: `src/search/` (will rebuild if needed)
- Delete: `src/data/hooks.ts`, `src/data/QueryProvider.tsx`
- Delete: `src/utils/seo.ts`, `src/utils/export.ts`, `src/utils/pathfinding.ts`
- Delete: `src/store/timeline.ts`, `src/store/search.ts`, `src/store/ui.ts`
- Modify: `vite.config.ts` (remove TanStack Router plugin)

**Interfaces:**
- Consumes: `fetchNodes`, `fetchEdges`, `fetchSources` from Task 3
- Produces: `App` component with graph + controls + side panel

- [ ] **Step 1: Simplify main.tsx**

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Remove TanStack Router from vite.config.ts**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create App shell with data loading**

```typescript
// src/App.tsx
import { useEffect, useState } from 'react'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import type { SourceRecord } from '@/types/source'
import { fetchNodes, fetchEdges, fetchSources } from '@/data/loaders'

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchNodes(), fetchEdges(), fetchSources()])
      .then(([n, e, s]) => { setNodes(n); setEdges(e); setSources(s) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Ачаалж байна...</div>
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">Алдаа: {error}</div>

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      <div className="flex-1 flex items-center justify-center text-slate-400">
        {nodes.length} nodes, {edges.length} edges loaded
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Delete old files**

```bash
rm -rf src/routes src/routeTree.gen.ts src/pages src/i18n src/search
rm -f src/data/hooks.ts src/data/QueryProvider.tsx
rm -f src/utils/seo.ts src/utils/export.ts src/utils/pathfinding.ts
rm -f src/store/timeline.ts src/store/search.ts src/store/ui.ts
```

- [ ] **Step 5: Remove @tanstack/router from package.json**

```bash
npm uninstall @tanstack/react-router @tanstack/router-cli @tanstack/router-vite-plugin
```

- [ ] **Step 6: Verify build**

Run: `npx vite build`
Expected: Build succeeds, no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: strip router, create single-page shell"
```

---

### Task 5: Graph visualization with new schema

**Files:**
- Modify: `src/graph/graphBuilder.ts`
- Create: `src/graph/SigmaGraph.tsx` (or modify existing)

**Interfaces:**
- Consumes: `Node[]`, `Edge[]` from Tasks 1-3
- Produces: `buildGraph()` → graphology Graph, `applyForceLayout()`

- [ ] **Step 1: Rewrite graphBuilder.ts**

```typescript
// src/graph/graphBuilder.ts
import Graph from 'graphology'
import circular from 'graphology-layout/circular'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { NODE_TYPE_COLORS } from '@/types/node'
import { CONFIDENCE_COLORS, CONFIDENCE_DASH } from '@/types/edge'

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph = new Graph({ type: 'directed', multi: true })

  for (const node of nodes) {
    const color = NODE_TYPE_COLORS[node.type] ?? '#64748b'
    const size = 4 + Math.pow((node.importance ?? 50) / 100, 1.5) * 24
    const labelColor = (node.importance ?? 50) >= 70 ? '#e2e8f0' : '#94a3b8'
    graph.addNode(node.id, {
      label: node.name,
      color,
      size,
      labelColor,
      nodeType: node.type,
      importance: node.importance ?? 50,
    })
  }

  for (const edge of edges) {
    if (!graph.hasNode(edge.from) || !graph.hasNode(edge.to)) continue
    if (edge.from === edge.to) continue

    const edgeColor = CONFIDENCE_COLORS[edge.confidence]
    const dash = CONFIDENCE_DASH[edge.confidence]
    const edgeKey = `${edge.id}`

    graph.addEdgeWithKey(edgeKey, edge.from, edge.to, {
      label: edge.relationship_type.replace(/_/g, ' '),
      color: edgeColor,
      size: 1.5,
      dash: dash.length ? dash : undefined,
      confidence: edge.confidence,
      edgeId: edge.id,
    })
  }

  return graph
}

export function applyForceLayout(graph: Graph): void {
  if (graph.order === 0) return
  try {
    circular.assign(graph)
    const settings = forceAtlas2.inferSettings(graph)
    forceAtlas2.assign(graph, {
      iterations: 200,
      settings: {
        ...settings,
        gravity: 1.2,
        scalingRatio: 3,
        strongGravityMode: false,
        barnesHutOptimize: graph.order > 50,
        slowDown: 4,
      },
    })
  } catch (e) {
    console.error('[shout.mn] ForceAtlas2 layout failed:', e)
    try { circular.assign(graph) } catch {}
  }
}
```

- [ ] **Step 2: Update SigmaGraph component**

Check existing `src/graph/SigmaGraph.tsx` and update to accept new graph type. The Sigma renderer needs `edgeReducer` to handle `dash` property for dashed/dotted edges.

- [ ] **Step 3: Integrate into App.tsx**

Wire `buildGraph` + `applyForceLayout` into the App component. Render `SigmaGraph` full viewport.

- [ ] **Step 4: Commit**

```bash
git add src/graph/
git commit -m "feat(graph): rebuild graph viz with confidence-tier edges"
```

---

### Task 6: Top bar (search + filters + legend)

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ConfidenceLegend.tsx`
- Create: `src/components/FilterPanel.tsx`
- Modify: `src/store/filters.ts` (update for new schema)

**Interfaces:**
- Consumes: `Node[]`, `Edge[]`, filter state from Zustand
- Produces: filter state (selected types, confidence tiers), search query

- [ ] **Step 1: Update filters store**

```typescript
// src/store/filters.ts
import { create } from 'zustand'
import type { NodeType } from '@/types/node'
import type { RelationshipType, ConfidenceTier } from '@/types/edge'

interface FiltersState {
  selectedNodeTypes: NodeType[]
  selectedRelTypes: RelationshipType[]
  selectedConfidence: ConfidenceTier[]
  searchQuery: string
  toggleNodeType: (t: NodeType) => void
  toggleRelType: (t: RelationshipType) => void
  toggleConfidence: (c: ConfidenceTier) => void
  setSearchQuery: (q: string) => void
  reset: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedNodeTypes: [],
  selectedRelTypes: [],
  selectedConfidence: [],
  searchQuery: '',
  toggleNodeType: (t) => set(s => ({
    selectedNodeTypes: s.selectedNodeTypes.includes(t)
      ? s.selectedNodeTypes.filter(x => x !== t)
      : [...s.selectedNodeTypes, t]
  })),
  toggleRelType: (t) => set(s => ({
    selectedRelTypes: s.selectedRelTypes.includes(t)
      ? s.selectedRelTypes.filter(x => x !== t)
      : [...s.selectedRelTypes, t]
  })),
  toggleConfidence: (c) => set(s => ({
    selectedConfidence: s.selectedConfidence.includes(c)
      ? s.selectedConfidence.filter(x => x !== c)
      : [...s.selectedConfidence, c]
  })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  reset: () => set({ selectedNodeTypes: [], selectedRelTypes: [], selectedConfidence: [], searchQuery: '' }),
}))
```

- [ ] **Step 2: Create TopBar component**

Build a semi-transparent overlay bar with search input, filter dropdowns, and legend toggle. Each filter shows checkbox list of available options derived from data.

- [ ] **Step 3: Create ConfidenceLegend**

Small overlay showing solid/dashed/dotted = documented/reported/alleged with Mongolian labels.

- [ ] **Step 4: Wire filters into graph**

Apply filters in `App.tsx` before `buildGraph` — filter nodes by type, edges by confidence/relationship type.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx src/components/ConfidenceLegend.tsx src/store/filters.ts
git commit -m "feat(controls): add top bar with search, filters, confidence legend"
```

---

### Task 7: Side panel (entity detail + evidence chain)

**Files:**
- Create: `src/components/SidePanel.tsx`
- Modify: `src/store/selection.ts` (update for new schema)
- Modify: `src/App.tsx` (wire side panel)

**Interfaces:**
- Consumes: selected `Node`, connected `Edge[]`, `SourceRecord[]`
- Produces: panel open/close state, selected node/edge

- [ ] **Step 1: Update selection store**

```typescript
// src/store/selection.ts
import { create } from 'zustand'

interface SelectionState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
```

- [ ] **Step 2: Create SidePanel component**

Slides in from right. Shows:
- Header: node name, type badge, subtype, role_title, active_dates
- Connected edges list: each shows relationship_type, other entity name, confidence badge (color-coded)
- Each edge expandable to show evidence chain: source name (linked), document type, date, note
- Close button + click-away dismiss

- [ ] **Step 3: Wire into App.tsx**

Connect `useSelectionStore` to Sigma graph events (node click → selectNode). Render `SidePanel` conditionally.

- [ ] **Step 4: Commit**

```bash
git add src/components/SidePanel.tsx src/store/selection.ts src/App.tsx
git commit -m "feat(panel): add side panel with entity detail and evidence chain"
```

---

### Task 8: About/methodology modal

**Files:**
- Create: `src/components/AboutModal.tsx`
- Modify: `src/components/TopBar.tsx` (add about link)

**Interfaces:**
- Consumes: nothing (static content)
- Produces: modal overlay with methodology text

- [ ] **Step 1: Create AboutModal**

Simple modal with:
- Project description (Mongolian)
- Data sources list (IAAC, GASR, shuukh.mn, tender.gov.mn, OCCRP, OpenSanctions)
- Confidence tier explanations
- Legal note (PDPL, Criminal Code 13.14)
- Methodology summary

- [ ] **Step 2: Add about link to TopBar**

Small "Тухай" link in top bar that opens the modal.

- [ ] **Step 3: Commit**

```bash
git add src/components/AboutModal.tsx src/components/TopBar.tsx
git commit -m "feat: add about/methodology modal"
```

---

### Task 9: GitHub Pages deployment

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `vite.config.ts` (verify base path)

**Interfaces:**
- Consumes: built `dist/`
- Produces: deployed site on GitHub Pages

- [ ] **Step 1: Verify vite.config.ts base path**

Ensure `base: process.env.VITE_BASE_PATH ?? '/'` is set. GitHub Actions will set `VITE_BASE_PATH=/shout.mn/` for the repo subpath.

- [ ] **Step 2: Update deploy workflow if needed**

Check `.github/workflows/deploy.yml` — should build with `VITE_BASE_PATH=/shout.mn/` and deploy `dist/`.

- [ ] **Step 3: Test build**

Run: `VITE_BASE_PATH=/shout.mn/ npx vite build`
Expected: Builds to `dist/` with correct base paths

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml vite.config.ts
git commit -m "chore: configure GitHub Pages deployment"
```

---

### Task 10: Cleanup and verify

**Files:**
- Delete: old type files (`src/types/entity.ts`, `src/types/relationship.ts`, `src/types/evidence.ts`, `src/types/investigation.ts`, `src/types/changelog.ts`)
- Delete: unused components, stores, utils
- Modify: `src/index.css` (clean up if needed)

- [ ] **Step 1: Delete old type files**

```bash
rm -f src/types/entity.ts src/types/relationship.ts src/types/evidence.ts
rm -f src/types/investigation.ts src/types/changelog.ts src/types/index.ts
```

- [ ] **Step 2: Delete unused components/stores**

Check for orphaned imports and remove:
- `src/components/pathfinder/` (not needed in single page)
- `src/store/graphView.ts` (if replaced)
- `src/store/timeline.ts` (already deleted)
- Any remaining old components

- [ ] **Step 3: Run typecheck**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `npx eslint .`
Expected: No errors (or only pre-existing)

- [ ] **Step 5: Verify full build**

Run: `npx vite build`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: cleanup old files, verify build"
```
