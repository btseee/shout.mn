import fs from 'node:fs'
import { buildGraph, applyForceLayout } from './graphBuilderProbe.ts'

const nodes = JSON.parse(fs.readFileSync('./public/data/nodes.json', 'utf8'))
const edges = JSON.parse(fs.readFileSync('./public/data/edges.json', 'utf8'))
const g = buildGraph(nodes, edges)

let threw = null
try {
  applyForceLayout(g)
} catch (e) {
  threw = e instanceof Error ? e.message : String(e)
}

let missing = 0
let nonFinite = 0
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
for (const n of g.nodes()) {
  const x = g.getNodeAttribute(n, 'x')
  const y = g.getNodeAttribute(n, 'y')
  if (x === undefined || y === undefined) missing++
  if (!Number.isFinite(x) || !Number.isFinite(y)) nonFinite++
  if (Number.isFinite(x) && Number.isFinite(y)) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
}

console.log(JSON.stringify({ order: g.order, size: g.size, threw, missing, nonFinite, minX, maxX, minY, maxY }, null, 2))
