/**
 * Scrape xacxom.iaac.mn asset declaration data.
 * Phase 1: Get all person records by first letter.
 * Phase 2: Get declaration details for selected persons.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const API_BASE = 'https://xacxom.iaac.mn/api/public/xacxom';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'mn-MN,mn;q=0.9',
};

const MONGOLIAN_LETTERS = [
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М',
  'Н', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ү', 'Ф', 'Х', 'Ц', 'Ч', 'Ш',
  'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я',
];

async function searchPersons(firstname: string): Promise<any[]> {
  const resp = await fetch(API_BASE + '/search', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ firstname }),
  });
  const data = await resp.json();
  return data.retdata || [];
}

async function getDeclaration(aidUserNum: string): Promise<any | null> {
  try {
    const resp = await fetch(`${API_BASE}/${aidUserNum}`, {
      method: 'GET',
      headers: { ...HEADERS, 'Content-Type': undefined },
    });
    const data = await resp.json();
    return data.retdata?.[0] || null;
  } catch (e) {
    return null;
  }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function phase1() {
  console.log('Phase 1: Collecting all person records...');
  const allPersons = new Map<string, any>();

  for (const letter of MONGOLIAN_LETTERS) {
    const records = await searchPersons(letter);
    let newCount = 0;
    for (const r of records) {
      if (!allPersons.has(r.aid_user_num)) {
        allPersons.set(r.aid_user_num, r);
        newCount++;
      }
    }
    console.log(`  ${letter}: ${records.length} records, ${newCount} new (total: ${allPersons.size})`);
    await sleep(200);
  }

  const persons = Array.from(allPersons.values());
  writeFileSync(join(DATA_DIR, 'xacxom-persons.json'), JSON.stringify(persons, null, 2));
  console.log(`\nSaved ${persons.length} persons to xacxom-persons.json`);
  return persons;
}

async function phase2(persons: any[]) {
  console.log('\nPhase 2: Getting declaration details...');

  // Priority: persons with most years, high positions
  const priority = persons
    .filter(p => p.years && p.years.length >= 3)
    .sort((a, b) => (b.years?.length || 0) - (a.years?.length || 0))
    .slice(0, 500); // Top 500 by years

  console.log(`Priority persons: ${priority.length}`);

  const existingPath = join(DATA_DIR, 'xacxom-declarations.json');
  const existing: any[] = existsSync(existingPath) ? JSON.parse(readFileSync(existingPath, 'utf8')) : [];
  const existingIds = new Set(existing.map((d: any) => d.aid_user_num));

  const declarations: any[] = [];
  let count = 0;

  for (const p of priority) {
    if (existingIds.has(p.aid_user_num)) continue;
    if (count >= 500) break; // Limit per run

    process.stdout.write(`  [${count + 1}/${priority.length}] ${p.last_name} ${p.first_name} `);
    const decl = await getDeclaration(p.aid_user_num);
    if (decl) {
      declarations.push(decl);
      console.log(`✓ ${(decl.owner_total || 0).toLocaleString()} MNT`);
    } else {
      console.log('✗');
    }
    count++;
    await sleep(300);
  }

  const allDeclarations = [...existing, ...declarations];
  writeFileSync(join(DATA_DIR, 'xacxom-declarations.json'), JSON.stringify(allDeclarations, null, 2));
  console.log(`\nSaved ${allDeclarations.length} declarations`);
}

async function main() {
  // Check if we already have persons
  const personsPath = join(DATA_DIR, 'xacxom-persons.json');
  let persons: any[];

  if (existsSync(personsPath)) {
    persons = JSON.parse(readFileSync(personsPath, 'utf8'));
    console.log(`Loaded ${persons.length} existing persons`);
  } else {
    persons = await phase1();
  }

  await phase2(persons);
}

main().catch(console.error);
