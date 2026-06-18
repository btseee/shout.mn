#!/usr/bin/env tsx
/**
 * Data validation script for shout.mn
 * Run: npm run validate:data
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../public/data')

function loadJson<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(resolve(dataDir, file), 'utf-8')) as T
  } catch (err) {
    console.error(`❌ Failed to load ${file}:`, err)
    process.exit(1)
  }
}

interface Entity { id: string; name: string; type: string; confidence: number; importance: number; sourceIds: string[]; createdAt: string; updatedAt: string }
interface Relationship { id: string; sourceEntityId: string; targetEntityId: string; relationshipType: string; confidence: number; strength: number; status: string; evidenceIds: string[]; sourceIds: string[]; startDate: string; endDate: string }
interface Source { id: string; title: string; publisher: string }
interface Evidence { id: string; sourceId: string; entityIds: string[]; relationshipIds: string[] }
interface Investigation { id: string; entityIds: string[]; relationshipIds: string[]; sourceIds: string[] }
interface ChangelogEntry { id: string; type: string; date: string }

const VALID_ENTITY_TYPES = ['person', 'company', 'organization', 'government_agency', 'project', 'asset', 'contract', 'donation', 'media', 'source']
const VALID_STATUSES = ['confirmed', 'probable', 'inferred', 'disputed']
const VALID_CHANGELOG_TYPES = ['entity_added', 'entity_updated', 'relationship_added', 'relationship_updated', 'source_added', 'evidence_added', 'evidence_updated', 'investigation_added']
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/

let errors = 0
let warnings = 0

function err(msg: string) { console.error(`  ❌ ${msg}`); errors++ }
function warn(msg: string) { console.warn(`  ⚠️  ${msg}`); warnings++ }
function ok(msg: string) { console.log(`  ✅ ${msg}`) }

function checkIds<T extends { id: string }>(items: T[], label: string): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (!item.id) { err(`${label}: item missing id`); continue }
    if (ids.has(item.id)) err(`${label}: duplicate id "${item.id}"`)
    else ids.add(item.id)
  }
  return ids
}

function checkDate(val: string, field: string, id: string) {
  if (!val) return
  if (!ISO_DATE_RE.test(val)) err(`${id}: invalid date format for ${field}: "${val}"`)
}

console.log('\n🔍 Validating shout.mn data...\n')

const entities = loadJson<Entity[]>('entities.json')
const relationships = loadJson<Relationship[]>('relationships.json')
const sources = loadJson<Source[]>('sources.json')
const evidence = loadJson<Evidence[]>('evidence.json')
const investigations = loadJson<Investigation[]>('investigations.json')
const changelog = loadJson<ChangelogEntry[]>('changelog.json')

// --- Unique IDs ---
console.log('📋 Checking unique IDs...')
const entityIds = checkIds(entities, 'entities')
const relIds = checkIds(relationships, 'relationships')
const sourceIds = checkIds(sources, 'sources')
const evidenceIds = checkIds(evidence, 'evidence')
const investigationIds = checkIds(investigations, 'investigations')
const changelogIds = checkIds(changelog, 'changelog')
ok(`${entities.length} entities, ${relationships.length} relationships, ${sources.length} sources, ${evidence.length} evidence, ${investigations.length} investigations, ${changelog.length} changelog entries`)

// --- Entity validation ---
console.log('\n👤 Validating entities...')
for (const e of entities) {
  if (!VALID_ENTITY_TYPES.includes(e.type)) err(`Entity ${e.id}: invalid type "${e.type}"`)
  if (typeof e.confidence !== 'number' || e.confidence < 0 || e.confidence > 100) err(`Entity ${e.id}: confidence must be 0–100, got ${e.confidence}`)
  if (typeof e.importance !== 'number' || e.importance < 0 || e.importance > 100) err(`Entity ${e.id}: importance must be 0–100, got ${e.importance}`)
  for (const sid of e.sourceIds ?? []) {
    if (!sourceIds.has(sid)) err(`Entity ${e.id}: sourceId "${sid}" not found in sources`)
  }
  checkDate(e.createdAt, 'createdAt', `Entity ${e.id}`)
}
ok(`${entities.length} entities validated`)

// --- Relationship validation ---
console.log('\n🔗 Validating relationships...')
for (const r of relationships) {
  if (!entityIds.has(r.sourceEntityId)) err(`Relationship ${r.id}: sourceEntityId "${r.sourceEntityId}" not found`)
  if (!entityIds.has(r.targetEntityId)) err(`Relationship ${r.id}: targetEntityId "${r.targetEntityId}" not found`)
  if (!VALID_STATUSES.includes(r.status)) err(`Relationship ${r.id}: invalid status "${r.status}"`)
  if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 100) err(`Relationship ${r.id}: confidence must be 0–100`)
  if (typeof r.strength !== 'number' || r.strength < 0 || r.strength > 100) err(`Relationship ${r.id}: strength must be 0–100`)
  for (const eid of r.evidenceIds ?? []) {
    if (!evidenceIds.has(eid)) err(`Relationship ${r.id}: evidenceId "${eid}" not found`)
  }
  for (const sid of r.sourceIds ?? []) {
    if (!sourceIds.has(sid)) err(`Relationship ${r.id}: sourceId "${sid}" not found`)
  }
  checkDate(r.startDate, 'startDate', `Relationship ${r.id}`)
  checkDate(r.endDate, 'endDate', `Relationship ${r.id}`)
}
ok(`${relationships.length} relationships validated`)

// --- Evidence validation ---
console.log('\n📄 Validating evidence...')
for (const ev of evidence) {
  if (!sourceIds.has(ev.sourceId)) err(`Evidence ${ev.id}: sourceId "${ev.sourceId}" not found`)
  for (const eid of ev.entityIds ?? []) {
    if (!entityIds.has(eid)) err(`Evidence ${ev.id}: entityId "${eid}" not found`)
  }
  for (const rid of ev.relationshipIds ?? []) {
    if (!relIds.has(rid)) err(`Evidence ${ev.id}: relationshipId "${rid}" not found`)
  }
}

// Check for orphaned evidence (no relationships referenced)
const orphaned = evidence.filter((ev) => (ev.relationshipIds ?? []).length === 0)
if (orphaned.length > 0) warn(`${orphaned.length} evidence items have no relationship references`)
ok(`${evidence.length} evidence items validated`)

// --- Investigation validation ---
console.log('\n🔍 Validating investigations...')
for (const inv of investigations) {
  for (const eid of inv.entityIds ?? []) {
    if (!entityIds.has(eid)) err(`Investigation ${inv.id}: entityId "${eid}" not found`)
  }
  for (const rid of inv.relationshipIds ?? []) {
    if (!relIds.has(rid)) err(`Investigation ${inv.id}: relationshipId "${rid}" not found`)
  }
  for (const sid of inv.sourceIds ?? []) {
    if (!sourceIds.has(sid)) err(`Investigation ${inv.id}: sourceId "${sid}" not found`)
  }
}
ok(`${investigations.length} investigations validated`)

// --- Changelog validation ---
console.log('\n📝 Validating changelog...')
for (const entry of changelog) {
  if (!VALID_CHANGELOG_TYPES.includes(entry.type)) err(`Changelog ${entry.id}: invalid type "${entry.type}"`)
  checkDate(entry.date, 'date', `Changelog ${entry.id}`)
}
ok(`${changelog.length} changelog entries validated`)

// --- Summary ---
console.log('\n' + '─'.repeat(50))
if (errors === 0 && warnings === 0) {
  console.log('✅ All validation checks passed!\n')
  process.exit(0)
} else {
  if (warnings > 0) console.warn(`⚠️  ${warnings} warning(s)`)
  if (errors > 0) {
    console.error(`\n❌ ${errors} error(s) found. Please fix before publishing.\n`)
    process.exit(1)
  } else {
    console.log('✅ Validation passed with warnings.\n')
    process.exit(0)
  }
}
