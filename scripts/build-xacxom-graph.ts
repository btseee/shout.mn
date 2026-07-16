/**
 * Build graph from xacxom declarations.
 * Creates person nodes with rich profiles.
 * Builds edges: same_org, colleague (same position type), family (surname-based).
 * Adds "influencer" nodes for key figures.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

interface DeclarationRecord {
  first_name: string
  last_name: string
  org_names: string
  year: number
  assigned_date?: string
  rank?: number
  owner_total?: number
  family_total?: number
  count_apartment_building?: number
  count_house_building?: number
  transports?: string
  transport_total_value?: number
  equipment_value?: number
  savings_mon_total?: number
  loan_total_value?: number
  lenders?: string
  stock_owner_name?: string
  stock_total_value?: number
  position_name?: string
}

function buildGraph() {
  const declarations: DeclarationRecord[] = JSON.parse(readFileSync(join(DATA_DIR, 'xacxom-declarations.json'), 'utf8'));
  console.log(`Declarations: ${declarations.length}`);

  // Group by person (full name)
  const byPerson = new Map<string, DeclarationRecord[]>();
  for (const d of declarations) {
    const key = `${d.last_name} ${d.first_name}`;
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(d);
  }

  console.log(`Unique persons: ${byPerson.size}`);

  // Build nodes
  const nodes: any[] = [];
  let nodeCounter = 1;

  for (const [name, decls] of byPerson) {
    const sorted = decls.sort((a, b) => (b.year || 0) - (a.year || 0));
    const latest = sorted[0];
    const allYears = [...new Set(decls.map(d => d.year).filter(Boolean))].sort();

    // Calculate importance based on wealth, position, and years
    const wealth = latest.owner_total || 0;
    const years = allYears.length;
    const posImportance = getPositionImportance(latest.position_name);
    const importance = Math.min(30 + posImportance + years * 5 + Math.min(Math.log10(wealth + 1) * 10, 30), 100);

    const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff&size=256&bold=true`;

    nodes.push({
      id: `person-${String(nodeCounter++).padStart(4, '0')}`,
      name,
      type: 'person',
      subtype: guessSubtype(latest.position_name),
      description: `${latest.position_name} @ ${latest.org_names}`,
      importance,
      image_url: imageUrl,
      profile: {
        organization: latest.org_names,
        position: latest.position_name,
        years: allYears,
        assigned_date: latest.assigned_date,
        rank: latest.rank,
        assets: {
          total_wealth: latest.owner_total,
          family_total: latest.family_total,
          buildings: (latest.count_apartment_building || 0) + (latest.count_house_building || 0),
          vehicles: latest.transports,
          vehicle_value: latest.transport_total_value,
          equipment_value: latest.equipment_value,
          savings: latest.savings_mon_total,
          loans: latest.loan_total_value,
          loan_bank: latest.lenders,
          stocks: latest.stock_owner_name,
        },
        declaration_years: allYears,
        latest_declaration: latest.year,
      },
    });
  }

  console.log(`Nodes: ${nodes.length}`);

  // Build edges
  const edges: any[] = [];
  let edgeCounter = 1;

  // 1. Same org edges (colleagues)
  const orgGroups = new Map<string, any[]>();
  for (const n of nodes) {
    const org = n.profile?.organization;
    if (!org) continue;
    if (!orgGroups.has(org)) orgGroups.set(org, []);
    orgGroups.get(org)!.push(n);
  }

  for (const [org, members] of orgGroups) {
    if (members.length < 2) continue;
    // Connect high-importance members
    const sorted = members.sort((a, b) => b.importance - a.importance);
    const top = sorted.slice(0, Math.min(sorted.length, 10));
    
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        edges.push({
          id: `edge-${String(edgeCounter++).padStart(5, '0')}`,
          source_node: top[i].id,
          target_node: top[j].id,
          relationship_type: 'same_org',
          confidence: 'documented',
          evidence: [{
            source_name: 'xacxom.iaac.mn',
            url: 'https://xacxom.iaac.mn/xacxom',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'declaration',
            note: `${org}`,
          }],
          relationship_detail: `${top[i].profile.position} & ${top[j].profile.position}`,
        });
      }
    }
  }

  // 2. Family edges (same surname patterns)
  const surnameGroups = new Map<string, any[]>();
  for (const n of nodes) {
    const surname = n.name.split(' ')[0]; // First part is surname
    if (!surnameGroups.has(surname)) surnameGroups.set(surname, []);
    surnameGroups.get(surname)!.push(n);
  }

  for (const [surname, members] of surnameGroups) {
    if (members.length < 2 || members.length > 5) continue; // Skip very common or single
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        // Only add if different orgs (to avoid duplicate same_org edges)
        if (members[i].profile?.organization === members[j].profile?.organization) continue;
        
        edges.push({
          id: `edge-${String(edgeCounter++).padStart(5, '0')}`,
          source_node: members[i].id,
          target_node: members[j].id,
          relationship_type: 'family',
          confidence: 'reported',
          evidence: [{
            source_name: 'xacxom.iaac.mn',
            url: 'https://xacxom.iaac.mn/xacxom',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'declaration',
            note: `${surname}`,
          }],
          relationship_detail: `${surname}`,
        });
      }
    }
  }

  // 3. Superior/subordinate edges (same org, different ranks)
  for (const [org, members] of orgGroups) {
    if (members.length < 2) continue;
    const withRank = members.filter(m => m.profile?.rank);
    if (withRank.length < 2) continue;
    
    withRank.sort((a, b) => (a.profile.rank || 0) - (b.profile.rank || 0));
    
    for (let i = 0; i < withRank.length - 1; i++) {
      const rankDiff = (withRank[i + 1].profile.rank || 0) - (withRank[i].profile.rank || 0);
      if (rankDiff > 0 && rankDiff <= 5) { // Close ranks
        edges.push({
          id: `edge-${String(edgeCounter++).padStart(5, '0')}`,
          source_node: withRank[i + 1].id,
          target_node: withRank[i].id,
          relationship_type: 'superior',
          confidence: 'reported',
          evidence: [{
            source_name: 'xacxom.iaac.mn',
            url: 'https://xacxom.iaac.mn/xacxom',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'declaration',
            note: `Rank ${withRank[i + 1].profile.rank} supervises rank ${withRank[i].profile.rank}`,
          }],
          relationship_detail: `${withRank[i + 1].profile.position} (rank ${withRank[i + 1].profile.rank}) → ${withRank[i].profile.position} (rank ${withRank[i].profile.rank})`,
        });
      }
    }
  }

  // 4. Financial links (similar high wealth in same sector)
  const highWealth = nodes.filter(n => (n.profile?.assets?.total_wealth || 0) > 100000);
  const wealthByOrg = new Map<string, any[]>();
  for (const n of highWealth) {
    const org = n.profile?.organization;
    if (!org) continue;
    if (!wealthByOrg.has(org)) wealthByOrg.set(org, []);
    wealthByOrg.get(org)!.push(n);
  }

  for (const [org, members] of wealthByOrg) {
    if (members.length < 2) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const wealthA = members[i].profile?.assets?.total_wealth || 0;
        const wealthB = members[j].profile?.assets?.total_wealth || 0;
        const ratio = Math.max(wealthA, wealthB) / Math.min(wealthA, wealthB);
        
        if (ratio < 3) { // Similar wealth levels
          edges.push({
            id: `edge-${String(edgeCounter++).padStart(5, '0')}`,
            source_node: members[i].id,
            target_node: members[j].id,
            relationship_type: 'financial_link',
            confidence: 'alleged',
            evidence: [{
              source_name: 'xacxom.iaac.mn',
              url: 'https://xacxom.iaac.mn/xacxom',
              date_accessed: new Date().toISOString().split('T')[0],
              document_type: 'declaration',
              note: `Similar wealth: ${(wealthA / 1000000).toFixed(1)}M & ${(wealthB / 1000000).toFixed(1)}M MNT`,
            }],
            relationship_detail: `Similar declared wealth at ${org}`,
          });
        }
      }
    }
  }

  console.log(`Edges: ${edges.length}`);

  writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(nodes, null, 2));
  writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(edges, null, 2));
  console.log('Saved');
}

function getPositionImportance(position: string | undefined): number {
  if (!position) return 0;
  const pos = position.toLowerCase();
  if (pos.includes('сайд') || pos.includes('засгийн')) return 30;
  if (pos.includes('дарга') || pos.includes('төлөөлөгч')) return 20;
  if (pos.includes('шүүгч') || pos.includes('прокурор')) return 15;
  if (pos.includes('мяргэжилтэн') || pos.includes('байцаагч')) return 10;
  return 5;
}

function guessSubtype(position: string | undefined): string {
  if (!position) return 'other';
  const pos = position.toLowerCase();
  if (pos.includes('шүүгч') || pos.includes('шийдвэр')) return 'judge';
  if (pos.includes('прокурор')) return 'prosecutor';
  if (pos.includes('цэрэг') || pos.includes('цагдаа')) return 'military';
  if (pos.includes('дарга') || pos.includes('төлөөлөгч') || pos.includes('сайд')) return 'politician';
  if (pos.includes('мяргэжилтэн') || pos.includes('байцаагч') || pos.includes('нягтлан')) return 'civil_servant';
  return 'other';
}

buildGraph();
