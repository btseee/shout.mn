/**
 * Enrich nodes with xacxom persons data (organization, position, years)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

interface Person {
  aid_user_num?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  organization_id?: number;
  position_num?: number;
  position_name?: string;
  years?: number[];
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
const persons: Person[] = JSON.parse(readFileSync(join(DATA_DIR, 'xacxom-persons.json'), 'utf-8'));

console.log(`Loaded ${nodes.length} nodes, ${persons.length} persons`);

// Build person lookup by name
const personByName = new Map<string, Person[]>();
for (const person of persons) {
  const name = `${person.last_name} ${person.first_name}`;
  if (!name || name === ' ') continue;
  if (!personByName.has(name)) {
    personByName.set(name, []);
  }
  personByName.get(name)!.push(person);
}

// Enrich each node
let enriched = 0;
for (const node of nodes) {
  const matchedPersons = personByName.get(node.name) || [];
  
  if (matchedPersons.length === 0) continue;

  if (!node.profile) node.profile = {};

  // Get all organizations and positions
  const orgs = [...new Set(matchedPersons.map(p => p.organization_name).filter(Boolean))];
  const positions = [...new Set(matchedPersons.map(p => p.position_name).filter(Boolean))];
  const allYears = [...new Set(matchedPersons.flatMap(p => p.years || []).filter(Boolean))].sort();

  // Update profile with richer data
  if (orgs.length > 0 && !node.profile.organization) {
    node.profile.organization = orgs[0];
  }
  if (positions.length > 0 && !node.profile.position) {
    node.profile.position = positions[0];
  }
  
  // Add all organizations and positions
  node.profile.all_organizations = orgs;
  node.profile.all_positions = positions;
  
  // Merge years
  const existingYears = node.profile.declaration_years || [];
  node.profile.declaration_years = [...new Set([...existingYears, ...allYears])].sort();

  enriched++;
}

console.log(`Enriched ${enriched} nodes with persons data`);

// Save enriched nodes
writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(nodes, null, 2));
console.log('Saved enriched nodes.json');
