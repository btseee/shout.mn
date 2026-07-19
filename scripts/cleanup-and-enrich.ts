/**
 * Cleanup and enrichment script:
 * 1. Remove non-politician nodes not connected to any politician
 * 2. Enrich all politicians with wanga MCP data
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

interface Node {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  description?: string;
  importance?: number;
  image_url?: string;
  aliases?: string[];
  tags?: string[];
  profile?: any;
}

interface Edge {
  id: string;
  source_node: string;
  target_node: string;
  relationship_type: string;
  confidence: string;
  evidence: any[];
  relationship_detail?: string;
}

// Load data
const nodes: Node[] = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf-8'));
const edges: Edge[] = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf-8'));

console.log(`Loaded: ${nodes.length} nodes, ${edges.length} edges`);

// Step 1: Find all politician node IDs
const politicianIds = new Set(
  nodes.filter(n => n.subtype === 'politician').map(n => n.id)
);
console.log(`Politicians: ${politicianIds.size}`);

// Step 2: Build adjacency - which nodes are connected to which
const connectedToPolitician = new Set<string>();

for (const edge of edges) {
  if (politicianIds.has(edge.source_node)) {
    connectedToPolitician.add(edge.target_node);
  }
  if (politicianIds.has(edge.target_node)) {
    connectedToPolitician.add(edge.source_node);
  }
}

// Step 3: Find nodes to keep
const nodesToKeep = new Set<string>();

// Always keep politicians
for (const id of politicianIds) {
  nodesToKeep.add(id);
}

// Keep non-politicians connected to politicians
for (const node of nodes) {
  if (politicianIds.has(node.id)) continue; // already added
  if (connectedToPolitician.has(node.id)) {
    nodesToKeep.add(node.id);
  }
}

// Step 4: Filter nodes and edges
const cleanedNodes = nodes.filter(n => nodesToKeep.has(n.id));
const cleanedEdges = edges.filter(
  e => nodesToKeep.has(e.source_node) && nodesToKeep.has(e.target_node)
);

console.log(`After cleanup: ${cleanedNodes.length} nodes, ${cleanedEdges.length} edges`);

// Count by subtype
const subtypeCounts: Record<string, number> = {};
for (const node of cleanedNodes) {
  const sub = node.subtype || 'unknown';
  subtypeCounts[sub] = (subtypeCounts[sub] || 0) + 1;
}
console.log('Node subtypes:', subtypeCounts);

// Save cleaned data
writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(cleanedNodes, null, 2));
writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(cleanedEdges, null, 2));

console.log('Cleanup complete. Saved to nodes.json and edges.json');
