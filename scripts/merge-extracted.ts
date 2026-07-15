/**
 * Merge extracted data into main nodes.json and edges.json.
 * Deduplicates and creates proper edges.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

// False positives to skip
const FALSE_POSITIVES = new Set([
  'Нийслэлийн Засаг', 'Түүнчлэн Эрүүл', 'Монгол Улсыг', 'Монгол Улсад',
  'Нийслэлийн Нийтийн', 'Нийслэлийн Хүүхэд', 'Хөх Монгол',
  'Аймгийн Мэргэжлийн', 'Аймгийн Эрүүл', 'Улмаар Нийслэлийн',
  'Авлигатай тэмцэх', 'Газрын дарга', 'Монгол Улсын', 'Нийслэл Улаанбаатар',
  'Монгол Улсаас',
]);

// Name dedup map (initials -> full name)
const NAME_MAP: Record<string, string> = {
  'З.Дашдаваагийн': 'З.Дашдаваа',
  'Дамдинсүрэнгийн Гансүрэнгийн': 'Д.Гансүрэн',
  'Дамдинсүрэнгийн Гансүрэн': 'Д.Гансүрэн',
  'Ж.Дамдинсүрэнгийн': 'Ж.Дамдинсүрэн',
  'Дамдины Ганзориг': 'Д.Ганзориг',
  'Тэрбишийн Мөнх': 'Т.Мөнх-Эрдэнэ',
  'Намжилын Долгорсүрэн': 'Н.Долгорсүрэн',
  'Сосорбурамын Со': 'С.Соёмбо-Эрдэнэ',
  'Жалбаагийн Бурмаа': 'Ж.Бурмаа',
  'Цээлийн Амаржаргал': 'Ц.Амаржаргал',
  'Бямбасүрэнгийн Отгонцэцэг': 'Б.Отгонцэцэг',
  'Жигдэнгийн Батттогтох': 'Ж.Баттогтох',
  'Юндэнгийн Энхмаа': 'Ю.Энхмаа',
  'Очирбатын Чулуунцэцэг': 'О.Чулуунцэцэг',
  'Магнайбаярын Мөнхдаваа': 'М.Мөнхдаваа',
  'Цэгмэдийн Дагиймаа': 'Ц.Дагиймаа',
  'Мянгаагийн Баясгалан': 'М.Баясгалан',
  'Намдагсүрэнгийн Батсайхан': 'Н.Батсайхан',
  'Лхүндэвийн Наранбаяр': 'Л.Наранбаяр',
  'Жамъянхоролын Оюунчимэг': 'Ж.Оюунчимэг',
  'Цэдэвийн Сувдмаа': 'Ц.Сувдмаа',
  'Ноостын Хонинхүү': 'Н.Хонинхүү',
  'Дашдоржийн Мөнхтуяа': 'Д.Мөнхтуяа',
  'Эрдэмбилэгийн Лхагвасүрэн': 'Э.Лхагвасүрэн',
};

function main() {
  // Load existing data
  const nodes = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf8'));
  const edges = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf8'));

  // Load extracted data
  const extractedNodes = JSON.parse(readFileSync(join(DATA_DIR, 'extracted-nodes.json'), 'utf8'));
  const extractedEdges = JSON.parse(readFileSync(join(DATA_DIR, 'extracted-edges.json'), 'utf8'));

  // Build existing name set for dedup
  const existingNames = new Set(nodes.map((n: any) => n.name));
  const existingIds = new Set(nodes.map((n: any) => n.id));

  let nodeCounter = nodes.length + 1;
  let edgeCounter = edges.length + 1;

  const newNodes: any[] = [];
  const newEdges: any[] = [];

  // Process extracted persons
  for (const en of extractedNodes) {
    if (en.type !== 'person') continue;

    let name = en.name;
    if (FALSE_POSITIVES.has(name)) continue;
    if (name.length < 4) continue;

    // Apply name map
    if (NAME_MAP[name]) name = NAME_MAP[name];

    // Skip if already exists
    if (existingNames.has(name)) continue;

    // Check if similar name exists
    let isDup = false;
    for (const existing of existingNames) {
      if (existing.includes(name) || name.includes(existing)) {
        isDup = true;
        break;
      }
    }
    if (isDup) continue;

    const id = `person-${String(nodeCounter++).padStart(3, '0')}`;
    existingNames.add(name);
    existingIds.add(id);

    newNodes.push({
      id,
      name,
      type: 'person',
      subtype: en.subtype || 'official',
      role_title: en.role_title || '',
      description: en.description || '',
      aliases: [],
      importance: en.importance || 25,
      source: en.source || '',
    });
  }

  // Process extracted gov bodies
  for (const en of extractedNodes) {
    if (en.type !== 'government_body') continue;

    const name = en.name;
    const id = `gov-${String(nodeCounter++).padStart(3, '0')}`;

    if (existingIds.has(id)) continue;

    existingIds.add(id);
    newNodes.push({
      id,
      name,
      type: 'government_body',
      subtype: '',
      role_title: '',
      description: en.description || '',
      aliases: [],
      importance: en.importance || 35,
      source: en.source || '',
    });
  }

  // Create edges for new persons
  // Link judges to courts, officials to IAAC
  for (const newNode of newNodes) {
    if (newNode.type === 'person') {
      if (newNode.subtype === 'judge') {
        // Link to IAAC
        newEdges.push({
          id: `edge-${String(edgeCounter++).padStart(4, '0')}`,
          source_node: newNode.id,
          target_node: 'gov-007', // Улсын дээд шүүх
          relationship_type: 'adjudicated',
          confidence: 'documented',
          evidence: [{
            source_name: 'shuukh.mn',
            url: newNode.source || '',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'court_decision',
            note: `Judge ${newNode.name}`,
          }],
        });
      } else {
        // Link to IAAC
        newEdges.push({
          id: `edge-${String(edgeCounter++).padStart(4, '0')}`,
          source_node: newNode.id,
          target_node: 'gov-001', // IAAC
          relationship_type: 'investigated_by',
          confidence: 'documented',
          evidence: [{
            source_name: 'IAAC report',
            url: newNode.source || '',
            date_accessed: new Date().toISOString().split('T')[0],
            document_type: 'government_report',
            note: `Mentioned in IAAC report`,
          }],
        });
      }
    }
  }

  // Merge
  const mergedNodes = [...nodes, ...newNodes];
  const mergedEdges = [...edges, ...newEdges];

  console.log(`Before: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`Added: ${newNodes.length} nodes, ${newEdges.length} edges`);
  console.log(`After: ${mergedNodes.length} nodes, ${mergedEdges.length} edges`);

  // Save
  writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(mergedNodes, null, 2));
  writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(mergedEdges, null, 2));
  console.log('Saved merged data');
}

main();
