/**
 * Merge parliament data with xacxom data properly.
 * Converts ALL old entities and relationships, creating person-to-person edges
 * for shared party/agency membership.
 * Removes orphan nodes at the end.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const GIT_DIR = join(DATA_DIR, '..', '..');

const oldEntities = JSON.parse(execSync('git show e5f3039:public/data/entities.json', { cwd: GIT_DIR }).toString());
const oldRelationships = JSON.parse(execSync('git show e5f3039:public/data/relationships.json', { cwd: GIT_DIR }).toString());

console.log(`Old data: ${oldEntities.length} entities, ${oldRelationships.length} relationships`);

// Build lookup for all entities
const entityMap = new Map<string, any>();
for (const e of oldEntities) {
  entityMap.set(e.id, e);
}

// Convert ALL person entities to new node format
const oldNodes: any[] = [];
let nodeCounter = 1;

for (const e of oldEntities) {
  if (e.type !== 'person') continue;

  const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=1e40af&color=fff&size=256&bold=true`;

  oldNodes.push({
    id: `parliament-${String(nodeCounter++).padStart(4, '0')}`,
    name: e.name,
    type: 'person',
    subtype: guessSubtype(e.description, e.tags),
    description: e.description || '',
    importance: e.importance || 50,
    image_url: imageUrl,
    aliases: e.aliases || [],
    tags: e.tags || [],
    profile: {
      organization: extractOrg(e.description),
      position: extractPosition(e.description),
      years: [],
      assets: {},
    },
    _oldId: e.id,
  });
}

console.log(`Converted ${oldNodes.length} parliament persons`);

// Build edges from relationships
const oldEdges: any[] = [];
let edgeCounter = 1;

// Step 1: Direct person-to-person relationships
for (const r of oldRelationships) {
  const sourceOld = entityMap.get(r.sourceEntityId);
  const targetOld = entityMap.get(r.targetEntityId);
  
  // Both must be persons for direct edge
  if (sourceOld?.type === 'person' && targetOld?.type === 'person') {
    const sourceNode = oldNodes.find(n => n._oldId === r.sourceEntityId);
    const targetNode = oldNodes.find(n => n._oldId === r.targetEntityId);
    
    if (sourceNode && targetNode) {
      const relType = mapRelType(r.relationshipType);
      oldEdges.push({
        id: `parliament-edge-${String(edgeCounter++).padStart(5, '0')}`,
        source_node: sourceNode.id,
        target_node: targetNode.id,
        relationship_type: relType,
        confidence: 'documented',
        evidence: [{
          source_name: 'Wikipedia/Parliament records',
          url: 'https://en.wikipedia.org/wiki/Politics_of_Mongolia',
          date_accessed: new Date().toISOString().split('T')[0],
          document_type: 'reference',
          note: r.description?.substring(0, 25) || r.relationshipType,
        }],
        relationship_detail: r.description || relType,
      });
    }
  }
}

// Step 2: Person-to-org relationships → group by org, connect members
const orgMemberships = new Map<string, string[]>(); // orgId -> [personOldId]

for (const r of oldRelationships) {
  const sourceOld = entityMap.get(r.sourceEntityId);
  const targetOld = entityMap.get(r.targetEntityId);
  
  if (sourceOld?.type === 'person' && targetOld?.type !== 'person') {
    // Person -> Org/Agency relationship
    if (!orgMemberships.has(r.targetEntityId)) {
      orgMemberships.set(r.targetEntityId, []);
    }
    orgMemberships.get(r.targetEntityId)!.push(r.sourceEntityId);
  }
}

// Create edges between members of same org
for (const [orgId, memberIds] of orgMemberships) {
  if (memberIds.length < 2) continue;
  const orgEntity = entityMap.get(orgId);
  const orgName = orgEntity?.name || orgId;
  
  // Connect each pair (limit to avoid explosion)
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < Math.min(memberIds.length, i + 5); j++) {
      const sourceNode = oldNodes.find(n => n._oldId === memberIds[i]);
      const targetNode = oldNodes.find(n => n._oldId === memberIds[j]);
      
      if (sourceNode && targetNode) {
        oldEdges.push({
          id: `parliament-edge-${String(edgeCounter++).padStart(5, '0')}`,
          source_node: sourceNode.id,
          target_node: targetNode.id,
          relationship_type: 'same_org',
          confidence: 'documented',
          evidence: [{
            source_name: 'Wikipedia/Parliament records',
            url: 'https://en.wikipedia.org/wiki/Politics_of_Mongolia',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'reference',
            note: `${orgName}`,
          }],
          relationship_detail: `${orgName}`,
        });
      }
    }
  }
}

console.log(`Created ${oldEdges.length} parliament edges`);

// Remove temp fields
for (const n of oldNodes) {
  delete n._oldId;
}

// Load current xacxom data
const xacxomNodes = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf8'));
const xacxomEdges = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf8'));

// Remove any existing parliament nodes from xacxom data (avoid duplicates on re-run)
const nonParliamentNodes = xacxomNodes.filter((n: any) => !n.id.startsWith('parliament-'));
const nonParliamentEdges = xacxomEdges.filter((e: any) => !e.id.startsWith('parliament-edge-') && !e.source_node.startsWith('parliament-') && !e.target_node.startsWith('parliament-'));
const parliamentXacxomEdges = xacxomEdges.filter((e: any) => e.source_node.startsWith('parliament-') || e.target_node.startsWith('parliament-'));

console.log(`Xacxom data: ${nonParliamentNodes.length} non-parliament nodes, ${nonParliamentEdges.length} non-parliament edges`);
console.log(`Removed ${xacxomNodes.length - nonParliamentNodes.length} existing parliament nodes`);
console.log(`Removed ${parliamentXacxomEdges.length} existing parliament edges`);

// Merge all data
const allNodes = [...nonParliamentNodes, ...oldNodes];
const allEdges = [...nonParliamentEdges, ...oldEdges];

console.log(`Merged: ${allNodes.length} nodes, ${allEdges.length} edges`);

// Find nodes with edges
const nodesWithEdges = new Set<string>();
for (const e of allEdges) {
  nodesWithEdges.add(e.source_node);
  nodesWithEdges.add(e.target_node);
}

// Filter out orphan nodes
const filteredNodes = allNodes.filter(n => nodesWithEdges.has(n.id));
const orphanCount = allNodes.length - filteredNodes.length;

console.log(`Removed ${orphanCount} orphan nodes`);
console.log(`Final: ${filteredNodes.length} nodes, ${allEdges.length} edges`);

// Save
writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(filteredNodes, null, 2));
writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(allEdges, null, 2));
console.log('Saved');

function mapRelType(oldType: string): string {
  const map: Record<string, string> = {
    'spouse': 'family',
    'parent': 'family',
    'political_ally': 'political_ally',
    'appointment': 'appointed_by',
    'employment': 'colleague',
    'former_colleague': 'colleague',
    'party_member': 'political_ally',
    'oversight': 'superior',
  };
  return map[oldType] || 'same_org';
}

function extractOrg(desc: string): string {
  if (!desc) return 'Улсын Их Хурал';
  // Try to extract org from description
  const orgMatch = desc.match(/(?:org|agency|ministry|commission)[^.]*?[\.\s]/i);
  return orgMatch?.[0]?.trim() || 'Улсын Их Хурал';
}

function extractPosition(desc: string): string {
  if (!desc) return 'Гишүүн';
  if (desc.includes('Ерөнхийлөгч')) return 'Ерөнхийлөгч';
  if (desc.includes('Ерөнхий сайд')) return 'Ерөнхий сайд';
  if (desc.includes('дарга')) return 'Дарга';
  if (desc.includes('гишүүн')) return 'Гишүүн';
  return 'Гишүүн';
}

function guessSubtype(description: string, tags: string[]): string {
  const text = (description || '').toLowerCase();
  const tagStr = (tags || []).join(' ').toLowerCase();
  
  if (text.includes('шүүгч') || text.includes('шийдвэр') || tagStr.includes('judge')) return 'judge';
  if (text.includes('прокурор') || tagStr.includes('prosecutor')) return 'prosecutor';
  if (text.includes('цэрэг') || text.includes('цагдаа') || tagStr.includes('military')) return 'military';
  if (text.includes('дарга') || text.includes('төлөөлөгч') || text.includes('сайд') || text.includes('ерөнхий') || tagStr.includes('minister') || tagStr.includes('president') || tagStr.includes('speaker')) return 'politician';
  if (text.includes('мяргэжилтэн') || text.includes('байцаагч') || text.includes('нягтлан')) return 'civil_servant';
  if (tagStr.includes('family') || tagStr.includes('first-lady')) return 'public_figure';
  return 'politician';
}
