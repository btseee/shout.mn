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
