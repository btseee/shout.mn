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
