# Mongolia Power-Mapping — Schema & Pipeline Design

**Date:** 2026-07-15
**Scope:** Full rebuild — schema, data files, single-page frontend, pipeline foundation
**Approach:** Schema-first, then pipeline, then frontend rebuild

---

## 1. Problem

shout.mn is a power-mapping visualization of Mongolian political connections. Current data model uses numeric confidence scores, loosely linked evidence, and 10 entity types. Needs rigorous schema matching public-accountability research standards: tiered confidence (documented/reported/alleged), mandatory evidence on every edge, and a defensible sourcing pipeline.

## 2. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Approach | Full rebuild | Clean schema from scratch, pipeline-first |
| Architecture | Single page, no routing | GitHub Pages static hosting, one view |
| Node types | 4 types + optional extras | Matches reference spec, practical |
| Edge confidence | 3-tier enum | Defensible, visualizable |
| Evidence | Mandatory on every edge | Core accountability requirement |
| Data files | 3-file structure | Clean, diffable, maintainable |
| Strength field | Dropped | Derivable from evidence count/quality |
| Edge description | Dropped | Evidence notes serve this purpose |

---

## 3. Data Model

### 3.1 Nodes

```typescript
type NodeType = 'person' | 'company' | 'government_body' | 'media_outlet'
type PersonSubtype = 'politician' | 'civil_servant' | 'business_person' | 'public_figure'

interface Node {
  id: string                          // e.g. "person-001"
  name: string                        // primary display name
  type: NodeType
  subtype?: PersonSubtype             // only when type = 'person'
  role_title?: string                 // current or most notable role
  active_dates?: {
    from: string                      // ISO date or year
    to?: string                       // null = currently active
  }
  description?: string                // optional biographical note
  aliases?: string[]                  // alternative name spellings
  importance?: number                 // 0-100, for graph node sizing
}
```

**Entity type mapping from current schema:**
- `person` → `person` (add `subtype`)
- `company` → `company`
- `government_agency` → `government_body`
- `media` → `media_outlet`
- **Dropped:** `project`, `asset`, `contract`, `donation`, `source`, `organization`

### 3.2 Edges

```typescript
type ConfidenceTier = 'documented' | 'reported' | 'alleged'

type RelationshipType =
  | 'family'
  | 'business_ownership'
  | 'employment'
  | 'appointment'
  | 'board_membership'
  | 'financial_transaction'
  | 'contract_awarded'
  | 'co_mention'
  | 'political_affiliation'

interface Evidence {
  source_name: string                 // human-readable source label
  url: string                         // source URL or reference
  date_accessed: string               // ISO date
  document_type: 'declaration' | 'court_ruling' | 'registry_record'
              | 'procurement_notice' | 'news_article' | 'other'
  note: string                        // ≤25-word paraphrase of supporting passage
}

interface Edge {
  id: string                          // e.g. "edge-001"
  from: string                        // source node id
  to: string                          // target node id
  relationship_type: RelationshipType
  confidence: ConfidenceTier
  evidence: Evidence[]                // MANDATORY, minimum 1 entry
  date_range?: {
    from?: string
    to?: string
  }
}
```

**Confidence tiers:**
- `documented` — primary source: registry filing, court record, official gazette, asset/interest declaration
- `reported` — published by at least one credible outlet, not independently verified
- `alleged` — single unverified source or tip. Display with explicit "unverified" label.

**Edge type mapping from current schema:**
- `spouse`, `parent` → `family`
- `ownership` → `business_ownership`
- `employment`, `colleague` → `employment`
- `appointment` → `appointment`
- `board_membership` → `board_membership`
- `procurement_contract` → `contract_awarded`
- `donation`, `investment` → `financial_transaction`
- `partnership`, `organizational_link` → `co_mention`
- `party_member`, `political_affiliation` → `political_affiliation`
- **Dropped:** `friendship`, `media_coverage`, `oversight`

### 3.3 Sources

```typescript
interface SourceRecord {
  id: string
  title: string
  url: string
  document_type: Evidence['document_type']
  publisher?: string
  date_accessed: string
  reliability_notes?: string
  tags?: string[]
}
```

Sources registry is deduplication layer. Edges reference sources by URL or source_name. Registry provides metadata and reliability context.

---

## 4. Data File Structure

```
public/data/
  nodes.json          # all nodes
  edges.json          # all edges (with inline evidence arrays)
  sources.json        # source registry
```

Replaces current 6-file structure (entities, relationships, evidence, sources, investigations, changelog). Investigations and changelog can be re-added later as separate concerns.

---

## 5. Frontend — Single Page on GitHub Pages

No routing. One `index.html`. All UI in one view.

### 5.1 Layout

```
┌──────────────────────────────────────────────┐
│  [Search]  [Filters ▾]           [Legend ▾]  │  ← top bar
├──────────────────────────────┬───────────────┤
│                              │               │
│                              │  Side Panel   │
│     Graph (full viewport)    │  (entity      │
│                              │   details)    │
│                              │               │
└──────────────────────────────┴───────────────┘
```

- **Graph:** fills viewport behind everything. Sigma.js / graphology (existing stack)
- **Top bar:** search input + filter dropdowns + confidence legend toggle. Semi-transparent overlay
- **Side panel:** slides in from right on node click. Shows entity + edges + evidence. Dismiss on click-away or X
- **No separate pages.** Entity details, search results, methodology — all live in the side panel or overlay modals

### 5.2 Graph Rendering

- **Edge style by confidence:**
  - `documented` → solid, `#475569`
  - `reported` → dashed, `#64748b`
  - `alleged` → dotted, `#94a3b8` + "unverified" tooltip on hover
- **Node size:** from `importance` field (4px–28px)
- **Node color:** by `type` (4 colors)
- **Layout:** ForceAtlas2 (existing)

### 5.3 Side Panel (entity detail)

- Header: name, type badge, subtype, role_title, active_dates
- Connected edges list: each shows relationship_type, other entity name, confidence badge
- Expandable evidence chain: source name (linked), document type, date, note
- Close button + click-away dismiss

### 5.4 Controls

- **Search:** top bar input. Matches `name` + `aliases`. Highlights matching nodes in graph
- **Filters:** confidence tier, relationship type, entity type. All togglable
- **Confidence legend:** small overlay, toggleable. Shows solid/dashed/dotted = documented/reported/alleged
- **About / Methodology:** modal overlay triggered from top bar link. Single modal, no page navigation

### 5.5 Deployment

- Vite build → `dist/`
- GitHub Actions deploys `dist/` to GitHub Pages
- `VITE_BASE_PATH` set to repo name for GitHub Pages subpath
- All data fetched from `public/data/*.json` at runtime (no server needed)

---

## 6. Pipeline Architecture (Future Sub-projects)

```
Documents → Collection → LLM Extraction → Validation → Human Review → edges.json
```

- **S2: Collection** — scripts per source (IAAC, GASR, shuukh.mn, tender.gov.mn, OCCRP, OpenSanctions)
- **S3: LLM Extraction** — one document at a time, system prompt from reference section 6, output = schema-compliant JSON
- **S4: Validation + Review** — schema validation, confidence tier promotion workflow (alleged → reported → documented)
- **S5: Data seeding** — run pipeline on real sources, populate initial dataset

---

## 7. Legal Constraints

- **PDPL (2022):** requires consent for personal data processing. Primary-source documents (registries, courts, gazettes) are defensible. Social media bulk collection is not.
- **Criminal Code 13.14:** defamation risk. Over 2,200 cases 2020-2024. Avoid characterizations ("corrupt", "unethical") — extract roles and relationships only.
- **Scope:** strongest for public office + public money holders. Weaker for public figures. Weakest for private individuals.

---

## 8. Migration Notes

Existing data (entities.json, relationships.json, evidence.json) contains real Mongolian political data. Migration path:

1. Map entity types: `government_agency` → `government_body`, `media` → `media_outlet`, drop others
2. Add `subtype` to person nodes based on `tags`
3. Map relationship types per Section 3.2 mapping
4. Convert numeric confidence to tier: ≥80 → documented, 50-79 → reported, <50 → alleged
5. Move evidence from separate file into edge inline arrays
6. Preserve all source references

Migration script will be built as part of implementation.
