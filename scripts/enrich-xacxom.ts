/**
 * Enrich nodes with all available xacxom declaration data.
 * Extracts: animals, lands, deals, licenses, building details, stock details, civil service rank
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

interface Declaration {
  org_names?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  position_name?: string;
  rank?: number;
  assigned_date?: string;
  year?: number;
  rocivilservice?: string;
  owner_total?: number;
  family_total?: number;
  savings_mon_total?: number;
  savings_other_total?: number;
  loan_total_value?: number;
  receivable_total?: number;
  total_treasure_value?: number;
  count_apartment_building?: number;
  count_house_building?: number;
  count_cottage_building?: number;
  count_fence_house_building?: number;
  count_service_building?: number;
  count_industrial_building?: number;
  count_office_building?: number;
  count_farm_building?: number;
  count_home_building?: number;
  count_parking_building?: number;
  count_auto_parking_building?: number;
  count_other_building?: number;
  total_construction_value?: number;
  transports?: string;
  transport_total_value?: number;
  animals?: string;
  animal_total_value?: number;
  lands?: string;
  land_total_value?: number;
  stock_owner_name?: string;
  stock_count?: string;
  stock_total_value?: string;
  lenders?: string;
  deal?: string;
  licenses?: string;
  license_total_value?: string;
}

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

// Load data
const nodes: Node[] = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf-8'));
const declarations: Declaration[] = JSON.parse(readFileSync(join(DATA_DIR, 'xacxom-declarations.json'), 'utf-8'));

console.log(`Loaded ${nodes.length} nodes, ${declarations.length} declarations`);

// Build declaration lookup by person name (both full and initial formats)
const declByName = new Map<string, Declaration[]>();
const declByInitial = new Map<string, Declaration[]>();
for (const decl of declarations) {
  const fullName = decl.name || `${decl.last_name} ${decl.first_name}`;
  const initialName = `${decl.last_name} ${decl.first_name}`;
  if (fullName) {
    if (!declByName.has(fullName)) declByName.set(fullName, []);
    declByName.get(fullName)!.push(decl);
  }
  if (initialName && initialName !== fullName) {
    if (!declByInitial.has(initialName)) declByInitial.set(initialName, []);
    declByInitial.get(initialName)!.push(decl);
  }
}

// Enrich each node
let enriched = 0;
for (const node of nodes) {
  // Try to find matching declarations
  let matchedDecls = declByName.get(node.name) || [];
  
  // Try initial format (e.g., "Н.Аасүрэн" -> "Нямдаваа Аасүрэн")
  if (matchedDecls.length === 0) {
    matchedDecls = declByInitial.get(node.name) || [];
  }

  // Try partial name match
  if (matchedDecls.length === 0) {
    for (const [name, d] of declByName) {
      if (node.name.includes(name) || name.includes(node.name)) {
        matchedDecls = d;
        break;
      }
    }
  }

  // Try matching by last name from node
  if (matchedDecls.length === 0) {
    const nodeParts = node.name.split(' ');
    if (nodeParts.length >= 2) {
      const nodeLastName = nodeParts[0];
      const nodeFirstName = nodeParts[1];
      // Search declarations for matching first name
      for (const [name, d] of declByName) {
        if (d[0]?.first_name && nodeFirstName.includes(d[0].first_name)) {
          matchedDecls = d;
          break;
        }
      }
    }
  }

  if (matchedDecls.length === 0) continue;

  // Use the most recent declaration
  const latest = matchedDecls.sort((a, b) => (b.year || 0) - (a.year || 0))[0];

  if (!node.profile) node.profile = {};

  // Add untapped fields
  node.profile.civil_service_rank = latest.rocivilservice || null;
  node.profile.receivable_total = latest.receivable_total || 0;
  node.profile.total_treasure_value = latest.total_treasure_value || 0;
  
  // Building breakdown
  node.profile.buildings_detail = {
    apartment: latest.count_apartment_building || 0,
    house: latest.count_house_building || 0,
    cottage: latest.count_cottage_building || 0,
    fence: latest.count_fence_house_building || 0,
    service: latest.count_service_building || 0,
    industrial: latest.count_industrial_building || 0,
    office: latest.count_office_building || 0,
    farm: latest.count_farm_building || 0,
    home: latest.count_home_building || 0,
    parking: latest.count_parking_building || 0,
    auto_parking: latest.count_auto_parking_building || 0,
    other: latest.count_other_building || 0,
    total_value: latest.total_construction_value || 0,
  };

  // Animals
  if (latest.animals) {
    node.profile.animals = latest.animals.trim();
    node.profile.animal_total_value = latest.animal_total_value || 0;
  }

  // Lands
  if (latest.lands) {
    node.profile.lands = latest.lands.trim();
    node.profile.land_total_value = latest.land_total_value || 0;
  }

  // Business deals
  if (latest.deal) {
    node.profile.business_deals = latest.deal.trim();
  }

  // Licenses
  if (latest.licenses) {
    node.profile.licenses = latest.licenses.trim();
    node.profile.license_total_value = latest.license_total_value || '';
  }

  // Stock details
  if (latest.stock_owner_name) {
    node.profile.stock_owner = latest.stock_owner_name.trim();
    node.profile.stock_count = latest.stock_count || '';
    node.profile.stock_total_value = latest.stock_total_value || '';
  }

  // All declaration years
  node.profile.declaration_years = matchedDecls.map(d => d.year).filter(Boolean).sort();
  node.profile.latest_declaration = Math.max(...matchedDecls.map(d => d.year || 0));

  enriched++;
}

console.log(`Enriched ${enriched} nodes with additional xacxom data`);

// Save enriched nodes
writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(nodes, null, 2));
console.log('Saved enriched nodes.json');
