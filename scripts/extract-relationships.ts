/**
 * Extract entities and relationships from scraped data.
 * Outputs in the same schema as existing nodes.json/edges.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

// Load existing data to avoid duplicates
let existingNodes: any[] = [];
let existingEdges: any[] = [];
try {
  existingNodes = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf8'));
  existingEdges = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf8'));
} catch {}

const existingPersonNames = new Set(
  existingNodes
    .filter(n => n.type === 'person')
    .map(n => n.name || '')
);

// Helper: check if name already exists
function isDuplicate(name: string): boolean {
  for (const existing of existingPersonNames) {
    if (existing.includes(name) || name.includes(existing)) return true;
  }
  return false;
}

// Extract persons from text
function extractPersons(text: string, sourceUrl: string): any[] {
  const persons: any[] = [];
  const seen = new Set<string>();

  // Pattern 1: Full names "Бат-Эрдэнэ Дорж" or "Оюун-Эрдэнэ Лувсандорж"
  const fullNameRe = /([А-ЯӨҮ][а-яөү]{2,15}(?:-[А-ЯӨҮ][а-яөү]{2,15})?)\s+([А-ЯӨҮ][а-яөү]{2,15}(?:-[А-ЯӨҮ][а-яөү]{2,15})?)/g;
  let match;
  while ((match = fullNameRe.exec(text)) !== null) {
    const name = `${match[1]} ${match[2]}`;
    if (!seen.has(name) && !isDuplicate(name)) {
      seen.add(name);
      persons.push({ name, initials: null, sourceUrl });
    }
  }

  // Pattern 2: Initials with surname "Б.М", "Н.Т", "З.Дашдаваа"
  const initialsRe = /([А-ЯӨҮ]{1,2})\.([А-ЯӨҮа-яөү]{2,15})/g;
  while ((match = initialsRe.exec(text)) !== null) {
    const initials = `${match[1]}.${match[2]}`;
    if (!seen.has(initials) && !isDuplicate(initials)) {
      seen.add(initials);
      persons.push({ name: null, initials, sourceUrl });
    }
  }

  return persons;
}

// Extract government bodies from text
function extractGovBodies(text: string, sourceUrl: string): any[] {
  const bodies: any[] = [];
  const seen = new Set<string>();

  const patterns = [
    /([А-ЯӨҮ][а-яөү\s]{3,25}яам)/g,
    /([А-ЯӨҮ][а-яөү\s]{3,25}агентлаг)/g,
    /([А-ЯӨҮ][а-яөү\s]{3,25}газар)/g,
    /([А-ЯӨҮ][а-яөү\s]{3,25}хороо)/g,
    /([А-ЯӨҮ][а-яөү\s]{3,25}үндэсний)/g,
    /([А-ЯӨҮ][а-яөү\s]{3,25}шүүх)/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1].trim();
      if (!seen.has(name) && name.length > 5) {
        seen.add(name);
        bodies.push({ name, sourceUrl });
      }
    }
  }

  return bodies;
}

// Extract companies from text
function extractCompanies(text: string, sourceUrl: string): any[] {
  const companies: any[] = [];
  const seen = new Set<string>();

  // Company patterns: "X ХХК", "X ХК", "X LLC"
  const companyRe = /([А-ЯӨҮ][а-яөү\s]{2,20}(?:ХХК|ХК|LLC|Inc))/g;
  let m;
  while ((m = companyRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      companies.push({ name, sourceUrl });
    }
  }

  return companies;
}

// Extract relationships from text
function extractRelationships(
  text: string,
  personIds: string[],
  sourceUrl: string
): any[] {
  const edges: any[] = [];

  // Investigation patterns
  if (text.includes('хэрэгт') || text.includes('гэмт хэрэг') || text.includes('мөрдөн')) {
    for (const personId of personIds) {
      edges.push({
        source_node: personId,
        target_node: 'iaac',
        relationship_type: 'investigated_by',
        confidence: 'documented',
        evidence: [{
          source_name: 'IAAC weekly report',
          url: sourceUrl,
          date_accessed: new Date().toISOString().split('T')[0],
          document_type: 'government_report',
          note: text.slice(0, 100).replace(/\s+/g, ' '),
        }],
      });
    }
  }

  // Employment patterns
  if (text.includes('ажиллаж') || text.includes('томилогдсон') || text.includes('алибан тушаалтан')) {
    for (const personId of personIds) {
      edges.push({
        source_node: personId,
        target_node: 'unknown-org',
        relationship_type: 'employment',
        confidence: 'reported',
        evidence: [{
          source_name: 'IAAC report',
          url: sourceUrl,
          date_accessed: new Date().toISOString().split('T')[0],
          document_type: 'government_report',
          note: text.slice(0, 100).replace(/\s+/g, ' '),
        }],
      });
    }
  }

  return edges;
}

function main() {
  // Read scraped data
  let iaacArticles: any[] = [];
  let shuukhDecisions: any[] = [];

  try {
    iaacArticles = JSON.parse(readFileSync(join(DATA_DIR, 'iaac-news.json'), 'utf8'));
  } catch {}
  try {
    shuukhDecisions = JSON.parse(readFileSync(join(DATA_DIR, 'shuukh-decisions.json'), 'utf8'));
  } catch {}

  const newNodes: any[] = [];
  const newEdges: any[] = [];
  const nodeIds = new Set(existingNodes.map(n => n.id));
  const seenPersons = new Set<string>();

  let nodeCounter = existingNodes.length + 1;

  // Process IAAC articles
  for (const article of iaacArticles) {
    const content = article.content;
    const url = article.url;

    // Extract persons
    const persons = extractPersons(content, url);
    const personIds: string[] = [];

    for (const p of persons) {
      const name = p.name || p.initials;
      if (!seenPersons.has(name)) {
        seenPersons.add(name);
        const id = `person-iaac-${String(nodeCounter++).padStart(3, '0')}`;
        newNodes.push({
          id,
          name: name,
          type: 'person',
          subtype: 'official',
          role_title: '',
          description: `Mentioned in IAAC report: ${url}`,
          aliases: [],
          importance: 30,
          source: url,
        });
        personIds.push(id);
      }
    }

    // Extract gov bodies
    const bodies = extractGovBodies(content, url);
    for (const b of bodies) {
      const id = `gov-${b.name.replace(/\s+/g, '-').slice(0, 30).toLowerCase()}`;
      if (!nodeIds.has(id)) {
        nodeIds.add(id);
        newNodes.push({
          id,
          name: b.name,
          type: 'government_body',
          subtype: '',
          role_title: '',
          description: `Mentioned in IAAC report`,
          aliases: [],
          importance: 40,
          source: url,
        });
      }
    }

    // Extract relationships
    const edges = extractRelationships(content, personIds, url);
    newEdges.push(...edges);
  }

  // Process shuukh decisions
  for (const decision of shuukhDecisions) {
    const content = decision.content;
    const url = decision.url;

    // Extract judge name
    const judgeMatch = content.match(/Шүүгч\s+([А-ЯӨҮ][а-яөү]+\s+[А-ЯӨҮ][а-яөү]+)/);
    if (judgeMatch) {
      const name = judgeMatch[1];
      if (!seenPersons.has(name)) {
        seenPersons.add(name);
        const id = `person-shuukh-${String(nodeCounter++).padStart(3, '0')}`;
        newNodes.push({
          id,
          name,
          type: 'person',
          subtype: 'judge',
          role_title: 'Шүүгч',
          description: `Judge in case: ${url}`,
          aliases: [],
          importance: 25,
          source: url,
        });
      }
    }

    // Extract prosecutor
    const prosecutorMatch = content.match(/Улсын яллагч\s+([А-ЯӨҮ][а-яөү]+\s+[А-ЯӨҮ][а-яөү]+)/);
    if (prosecutorMatch) {
      const name = prosecutorMatch[1];
      if (!seenPersons.has(name)) {
        seenPersons.add(name);
        const id = `person-shuukh-${String(nodeCounter++).padStart(3, '0')}`;
        newNodes.push({
          id,
          name,
          type: 'person',
          subtype: 'prosecutor',
          role_title: 'Улсын яллагч',
          description: `Prosecutor in case: ${url}`,
          aliases: [],
          importance: 25,
          source: url,
        });
      }
    }
  }

  console.log(`New nodes: ${newNodes.length}`);
  console.log(`New edges: ${newEdges.length}`);

  // Save as separate files (to be merged later)
  writeFileSync(join(DATA_DIR, 'extracted-nodes.json'), JSON.stringify(newNodes, null, 2));
  writeFileSync(join(DATA_DIR, 'extracted-edges.json'), JSON.stringify(newEdges, null, 2));
  console.log('Saved to extracted-nodes.json and extracted-edges.json');
}

main();
