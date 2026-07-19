/**
 * Create derived edges from shared characteristics
 * - Same organization
 * - Similar livestock ownership
 * - Same region (based on organization)
 * - Similar asset profiles
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

const nodes = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf-8'));
const edges = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf-8'));

console.log(`Loaded ${nodes.length} nodes, ${edges.length} edges`);

const existingEdgeKeys = new Set(edges.map(e => `${e.source_node}|${e.target_node}|${e.relationship_type}`));
let newEdges = 0;

// Group nodes by organization
const orgGroups = new Map<string, string[]>();
for (const node of nodes) {
  const org = node.profile?.organization;
  if (org) {
    if (!orgGroups.has(org)) orgGroups.set(org, []);
    orgGroups.get(org)!.push(node.id);
  }
}

// Create same_org edges for nodes sharing organizations
for (const [org, nodeIds] of orgGroups) {
  if (nodeIds.length < 2 || nodeIds.length > 10) continue; // Skip solo or huge groups
  
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const edgeKey = `${nodeIds[i]}|${nodeIds[j]}|same_org`;
      const edgeKeyRev = `${nodeIds[j]}|${nodeIds[i]}|same_org`;
      if (existingEdgeKeys.has(edgeKey) || existingEdgeKeys.has(edgeKeyRev)) continue;
      
      edges.push({
        id: `edge-${String(edges.length + 1).padStart(4, '0')}`,
        source_node: nodeIds[i],
        target_node: nodeIds[j],
        relationship_type: 'same_org',
        confidence: 'documented',
        weight: 0.6,
        relationship_detail: `Хамтран ажилладаг: ${org}`,
        evidence: [{
          source_name: 'xacxom.iaac.mn',
          note: `Хамтын мэдүүлэгт үндэслэсэн`,
        }],
      });
      existingEdgeKeys.add(edgeKey);
      newEdges++;
    }
  }
}

// Group nodes by livestock ownership patterns
const livestockNodes: { id: string; animals: string }[] = [];
for (const node of nodes) {
  if (node.profile?.animals && node.profile.animals.length > 5) {
    livestockNodes.push({ id: node.id, animals: node.profile.animals });
  }
}

// Parse animal types
function parseAnimals(animals: string): Map<string, number> {
  const map = new Map<string, number>();
  const parts = animals.split(',');
  for (const part of parts) {
    const match = part.trim().match(/(\S+)-(\d+)/);
    if (match) {
      map.set(match[1], parseInt(match[2]));
    }
  }
  return map;
}

// Find nodes with similar livestock profiles
for (let i = 0; i < livestockNodes.length; i++) {
  for (let j = i + 1; j < livestockNodes.length; j++) {
    const a1 = parseAnimals(livestockNodes[i].animals);
    const a2 = parseAnimals(livestockNodes[j].animals);
    
    // Check if they have similar animal types
    const commonTypes = [...a1.keys()].filter(k => a2.has(k));
    if (commonTypes.length >= 2) {
      const edgeKey = `${livestockNodes[i].id}|${livestockNodes[j].id}|colleague`;
      const edgeKeyRev = `${livestockNodes[j].id}|${livestockNodes[i].id}|colleague`;
      if (existingEdgeKeys.has(edgeKey) || existingEdgeKeys.has(edgeKeyRev)) continue;
      
      // Only create if they're in similar organizations
      const node1 = nodes.find(n => n.id === livestockNodes[i].id);
      const node2 = nodes.find(n => n.id === livestockNodes[j].id);
      if (node1?.profile?.organization === node2?.profile?.organization) {
        edges.push({
          id: `edge-${String(edges.length + 1).padStart(4, '0')}`,
          source_node: livestockNodes[i].id,
          target_node: livestockNodes[j].id,
          relationship_type: 'colleague',
          confidence: 'alleged',
          weight: 0.3,
          relationship_detail: `Хамтран мал эзэмшиж байж магадгүй: ${commonTypes.join(', ')}`,
          evidence: [{
            source_name: 'xacxom.iaac.mn',
            note: `Малын мэдүүлэгт үндэслэсэн`,
          }],
        });
        existingEdgeKeys.add(edgeKey);
        newEdges++;
      }
    }
  }
}

console.log(`Created ${newEdges} derived edges`);

// Save
writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(edges, null, 2));
console.log(`Saved ${nodes.length} nodes, ${edges.length} edges`);
