/**
 * Create nodes and edges from the 22 politicians article
 * Article: "Чимээгүй шагнал хүртсэн 22 улс төрч"
 * Source: unnu.news, 2026-07-09
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

// Load existing data
const nodes = JSON.parse(readFileSync(join(DATA_DIR, 'nodes.json'), 'utf-8'));
const edges = JSON.parse(readFileSync(join(DATA_DIR, 'edges.json'), 'utf-8'));

console.log(`Loaded ${nodes.length} nodes, ${edges.length} edges`);

// 22 politicians from the article with their awards and political context
const politicians = [
  { name: 'С.Бямбацогт', award: 'Гавьяат хуульч', role: 'УИХ-ын дарга', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Г.Занданшатар', award: 'Гавьяат эдийн засагч', role: 'Ерөнхий сайд асан', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Т.Доржханд', award: 'Гавьяат эдийн засагч', role: 'Сайд', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Г.Дамдинням', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'Сайд', faction: 'Хүрэлсүхийн фракц' },
  { name: 'З.Мэндсайхан', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'Сайд', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Л.Мөнхбаатар', award: 'Сүхбаатарын одон', role: 'ХЗДХ-ийн сайд асан', faction: null },
  { name: 'Д.Бум-Очир', award: 'Шинжлэх ухааны гавьяат зүтгэлтэн', role: 'УИХ-ын гишүүн', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Сү.Батболд', award: 'Гавьяат эдийн засагч', role: 'Нэр нөлөөтэй улстөрч', faction: null },
  { name: 'Р.Сэддорж', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Н.Наранбаатар', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Т.Мөнхсайхан', award: 'Гавьяат эмч', role: 'Эрүүл мэндийн сайд асан', faction: null },
  { name: 'Б.Жавхлан', award: 'Гавьяат эдийн засагч', role: 'Сангийн сайд асан', faction: null },
  { name: 'Х.Болормаа', award: 'Үйлчилгээний гавьяат ажилтан', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Д.Ганбат', award: 'Гавьяат хуульч', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Х.Жангабыль', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Г.Ганбаатар', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'О.Саранчулуун', award: 'Алтангадас одон', role: 'УИХ-ын гишүүн', faction: 'Оюун-Эрдэнийн фракц' },
  { name: 'О.Алтангэрэл', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'ХЗДХ-ийн сайд асан', faction: null },
  { name: 'Ө.Шижир', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: 'Хүрэлсүхийн фракц' },
  { name: 'Х.Тэмүүжин', award: 'Гавьяат хуульч', role: 'УИХ-ын гишүүн', faction: 'АН' },
  { name: 'Л.Мөнхбаясгалан', award: 'Соёлын гавьяат зүтгэлтэн', role: 'УИХ-ын гишүүн', faction: null },
  { name: 'Ж.Баярмаа', award: 'Хөдөлмөрийн гавьяаны улаан тугийн одон', role: 'УИХ-ын гишүүн', faction: 'Ардчилсан нам' },
];

// Political relationships from the article
const politicalRelationships = [
  // Хүрэлсүхийн фракц members
  { from: 'С.Бямбацогт', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн фракцыг төлөөлж УИХ-ын даргаар сонгогдсон' },
  { from: 'Г.Занданшатар', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн тамгын газрын дарга, дараа нь Ерөнхий сайд' },
  { from: 'Т.Доржханд', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Гурван танхим дамнан сайдаар ажилласан, Ерөнхийлөгчийн фракц' },
  { from: 'Г.Дамдинням', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн фракцаас Засгийн газарт орж ирсэн' },
  { from: 'З.Мэндсайхан', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн фракцаас Засгийн газарт орж ирсэн' },
  { from: 'Д.Бум-Очир', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн фракцын гишүүн' },
  { from: 'Ө.Шижир', to: 'У.Хүрэлсүх', type: 'political_ally', detail: 'Ерөнхийлөгчийн үед тамгын газрын даргаар ажиллаж байсан' },
  
  // Government service relationships
  { from: 'Г.Занданшатар', to: 'Н.Учрал', type: 'superior', detail: 'Н.Учралыг Ерөнхий сайд болгох фракцын шахалтыг хүлээн авч ажлаа өгсөн' },
  { from: 'Л.Мөнхбаатар', to: 'Г.Занданшатар', type: 'subordinate', detail: 'ХЗДХ-ийн сайдаас "хусагдаж" Б.Энхбаяраар солигдсон' },
  
  // Оюун-Эрдэнийн фракц
  { from: 'О.Саранчулуун', to: 'Л.Оюун-Эрдэнэ', type: 'political_ally', detail: 'Л.Оюун-Эрдэнийн фракцад хамаарч явдаг' },
  
  // АН харьяалал
  { from: 'Х.Тэмүүжин', to: 'Ардчилсан нам', type: 'political_ally', detail: 'Ерөнхийлөгчийг АН-аас хамгийн их шүүмжилдэг' },
  { from: 'Ж.Баярмаа', to: 'Ардчилсан нам', type: 'political_ally', detail: 'Ардчилсан намаас, Засгийн газрыг шүүмжлэн унагалцсан' },
  
  // Shared awards
  { from: 'С.Бямбацогт', to: 'Д.Ганбат', type: 'colleague', detail: 'Хоёр ч Гавьяат хуульч шагнал хүртсэн' },
  { from: 'Г.Занданшатар', to: 'Т.Доржханд', type: 'colleague', detail: 'Хоёр ч Гавьяат эдийн засагч шагнал хүртсэн' },
];

// Find or create nodes
let newNodes = 0;
let newEdges = 0;
const existingEdgeKeys = new Set(edges.map(e => `${e.source_node}|${e.target_node}|${e.relationship_type}`));

for (const pol of politicians) {
  // Find existing node
  const existingNode = nodes.find(n => n.name.includes(pol.name) || pol.name.includes(n.name));
  
  if (existingNode) {
    // Add award info to profile
    if (!existingNode.profile) existingNode.profile = {};
    existingNode.profile.award_2026 = pol.award;
    existingNode.profile.award_role = pol.role;
    existingNode.profile.political_faction = pol.faction;
    existingNode.tags = existingNode.tags || [];
    if (!existingNode.tags.includes('awarded-2026')) {
      existingNode.tags.push('awarded-2026');
    }
  } else {
    // Create new node
    const nodeId = `person-${String(nodes.length + newNodes + 1).padStart(4, '0')}`;
    const nodeName = pol.name;
    const encodedName = encodeURIComponent(nodeName);
    nodes.push({
      id: nodeId,
      name: nodeName,
      type: 'person',
      subtype: 'politician',
      description: `${pol.role} — ${pol.award}`,
      importance: 75,
      image_url: `https://ui-avatars.com/api/?name=${encodedName}&background=1e40af&color=fff&size=256&bold=true`,
      aliases: [],
      tags: ['awarded-2026', 'parliament-2020-2028'],
      profile: {
        position: pol.role,
        award_2026: pol.award,
        political_faction: pol.faction,
        declaration_years: [2021, 2022, 2023, 2024, 2025],
      },
    });
    newNodes++;
  }
}

// Create political relationship edges
for (const rel of politicalRelationships) {
  const fromNode = nodes.find(n => n.name.includes(rel.from) || rel.from.includes(n.name));
  const toNode = nodes.find(n => n.name.includes(rel.to) || rel.to.includes(n.name));
  
  if (!fromNode || !toNode) {
    console.log(`  SKIP: ${rel.from} -> ${rel.to} (node not found)`);
    continue;
  }
  
  const edgeKey = `${fromNode.id}|${toNode.id}|${rel.type}`;
  if (existingEdgeKeys.has(edgeKey)) {
    console.log(`  EXISTS: ${rel.from} -> ${rel.to}`);
    continue;
  }
  
  edges.push({
    id: `edge-${String(edges.length + 1).padStart(4, '0')}`,
    source_node: fromNode.id,
    target_node: toNode.id,
    relationship_type: rel.type,
    confidence: 'reported',
    weight: 0.7,
    relationship_detail: rel.detail,
    evidence: [{
      source_name: 'unnu.news',
      note: 'Чимээгүй шагнал хүртсэн 22 улс төрч, 2026-07-09',
      url: 'https://www.unnu.news/article/chimeeg-j-shagnal-h-rtsen-22-uls-t-rch-uih-yn-20-gish-nij-czaadah-uls-t-r',
    }],
  });
  existingEdgeKeys.add(edgeKey);
  newEdges++;
}

console.log(`\nCreated ${newNodes} new nodes, ${newEdges} new edges`);

// Save
writeFileSync(join(DATA_DIR, 'nodes.json'), JSON.stringify(nodes, null, 2));
writeFileSync(join(DATA_DIR, 'edges.json'), JSON.stringify(edges, null, 2));
console.log(`Saved ${nodes.length} nodes, ${edges.length} edges`);
