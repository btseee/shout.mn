#!/usr/bin/env node
/**
 * Add 2024-2028 State Great Khural members to the graph.
 * Sources: Wikipedia "List of members of the State Great Khural, 2024-2028"
 * and "2024 Mongolian parliamentary election"
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

interface Node {
  id: string
  name: string
  type: string
  subtype?: string
  role_title?: string
  description?: string
  aliases?: string[]
  importance?: number
  active_dates?: { from: string; to?: string }
}

interface Evidence {
  source_name: string
  url: string
  date_accessed: string
  document_type: string
  note: string
}

interface Edge {
  id: string
  from: string
  to: string
  relationship_type: string
  confidence: string
  evidence: Evidence[]
  date_range?: { from?: string; to?: string }
}

const WIKI_EVIDENCE: Evidence = {
  source_name: 'Wikipedia',
  url: 'https://en.wikipedia.org/wiki/List_of_members_of_the_State_Great_Khural,_2024%E2%80%932028',
  date_accessed: '2026-07-15',
  document_type: 'other',
  note: 'Wikipedia list of 2024-2028 State Great Khural members with party affiliations'
}

const ELECTION_EVIDENCE: Evidence = {
  source_name: 'Wikipedia',
  url: 'https://en.wikipedia.org/wiki/2024_Mongolian_parliamentary_election',
  date_accessed: '2026-07-15',
  document_type: 'other',
  note: '2024 Mongolian parliamentary election results'
}

// Party node IDs (will create if not exist)
const PARTY_IDS: Record<string, string> = {
  'MPP': 'party-mpp',
  'DP': 'party-dp',
  'HUN Party': 'party-hun',
  'National Coalition': 'party-national-coalition',
  'Civil Will-Green Party': 'party-civil-will-green',
}

const PARTY_NAMES: Record<string, string> = {
  'MPP': 'Монгол Ардын Нам (МАН)',
  'DP': 'Ардчилсан Нам (АН)',
  'HUN Party': 'Хүн Нам',
  'National Coalition': 'Үндэсний Эвсэл',
  'Civil Will-Green Party': 'Иргэний Зориг-Ногоон Нам',
}

// Existing node IDs to skip
const EXISTING_IDS = new Set([
  'person-001', 'person-002', 'person-003', 'person-004', 'person-005',
  'person-006', 'person-007', 'person-008', 'person-009', 'person-010',
  'person-011', 'person-012', 'person-013', 'person-014', 'person-015',
  'person-016', 'person-017', 'person-018', 'person-019', 'person-020',
  'person-021', 'person-022', 'person-023', 'person-024', 'person-025',
  'person-026', 'person-027', 'person-028', 'person-029', 'person-030',
  'person-031', 'person-032', 'person-033', 'person-034', 'person-035',
  'person-036', 'person-037', 'person-038', 'person-039', 'person-040',
  'person-041', 'person-042', 'person-043', 'person-044', 'person-045',
  'person-046', 'person-047', 'person-048', 'person-049', 'person-050',
  'person-051', 'person-052', 'person-053', 'person-054', 'person-055',
  'person-056', 'person-057', 'person-058', 'person-059', 'person-060',
  'person-061', 'person-062', 'person-063', 'person-064', 'person-065',
  'person-066', 'person-067', 'person-068', 'person-069', 'person-070',
  'person-071', 'person-072', 'person-073', 'person-074', 'person-075',
  'person-076', 'person-077', 'person-078', 'person-079', 'person-080',
  'person-081', 'person-082', 'person-083', 'person-084', 'person-085',
  'person-086', 'person-087', 'person-088',
  'agency-001', 'agency-002', 'agency-003',
  'company-001', 'company-002', 'company-003',
])

// Map of name -> existing node ID for deduplication
const NAME_TO_ID: Record<string, string> = {
  'Ухнаагийн Хүрэлсүх': 'person-001',
  'Лувсандорж Болорцэцэг': 'person-002',
  'Лувсаннамсрайн Оюун-Эрдэнэ': 'person-003',
  'Болдын Туул': 'person-004',
  'Тэмүүлэн Оюун-Эрдэнэ': 'person-005',
  'Ням-Осорын Учрал': 'person-006',
  'Батмөнхийн Батцэцэг': 'person-007',
  'Жадамбын Энхбаяр': 'person-008',
  'Гонгорын Дамдинням': 'person-009',
  'Сандагийн Бямбацогт': 'person-010',
  'Жаргалтулгын Эрдэнэбат': 'person-011',
  'Гомбожавын Занданшатар': 'person-012',
  'Загджавын Мэндсайхан': 'person-013',
  'Болдын Жавхлан': 'person-056',
  'Баагаагийн Баттөмөр': 'person-057',
  'Дамбын Батлут': 'person-058',
  'Норовын Алтанхуяг': 'person-059',
  'Сайнхүүгийн Ганбаатар': 'person-060',
  'Сайнбуянгийн Амарсайхан': 'person-061',
  'Цэндийн Сандаг-Очир': 'person-062',
  'Баттөмөрийн Энхбаяр': 'person-063',
  'Батсүхийн Саранчимэг': 'person-064',
  'Жигждсүрэнгийн Чинбүрэн': 'person-065',
  'Хүрэлбаатарын Булгантуяа': 'person-066',
  'Энхтайваны Бат-Амгалан': 'person-067',
  'Дамдины Цогтбаатар': 'person-068',
  'Цэндийн Мөнх-Оргил': 'person-069',
  'Цэрэнжамцын Мөнхцэцэг': 'person-070',
  'Тэморбаатарын Аюурсайхан': 'person-071',
  'Мөнхөөгийн Оюунчимэг': 'person-072',
  'Жамьянхорлоогийн Сүхбаатар': 'person-073',
  'Хассуурийн Ганхуяг': 'person-074',
  'Жамбалын Ганбаатар': 'person-075',
  'Салдангийн Одонтуяа': 'person-076',
  'Хишгээгийн Нямбаатар': 'person-077',
  'Бадарчийн Жаргалмаа': 'person-078',
  'Дологрсүрэнгийн Сумьяабазар': 'person-079',
  'Энхбаярын Батшугар': 'person-080',
  'Пурэв-Очирын Анужин': 'person-081',
  'Ганибалын Амартүвшин': 'person-082',
  'Дагвааянцангийн Саранцэцэг': 'person-083',
  'Тогмидын Доржханд': 'person-084',
  'Халтмаагийн Батулга': 'person-085',
  'Дашзэгвийн Амарбаясгалан': 'person-086',
  'Лувсанням Гантөмөр': 'person-087',
  'Хишгээгийн Няамбаатар': 'person-088',
  // English names
  'Ukhnaagiin Khürelsükh': 'person-001',
  'Luvsannamsrain Oyun-Erdene': 'person-003',
  'Nyam-Osoryn Uchral': 'person-006',
  'Battsetseg Batmunkh': 'person-007',
  'Jadambyn Enkhbayar': 'person-008',
  'Gongoryn Damdinnyam': 'person-009',
  'Sandagiin Byambatsogt': 'person-010',
  'Jargaltulgyn Erdenebat': 'person-011',
  'Gombojavyn Zandanshatar': 'person-012',
  'Zagdjavyn Mendsaikhan': 'person-013',
  'Boldyn Javkhlan': 'person-056',
  'Dambyn Batlut': 'person-058',
  'Norovyn Altankhuyag': 'person-059',
  'Sainkhüügiin Ganbaatar': 'person-060',
  'Sainbuyangiin Amarsaikhan': 'person-061',
  'Tsendiin Sandag-Ochir': 'person-062',
  'Battömöriin Enkhbayar': 'person-063',
  'Chinbatyn Undram': 'person-065',
  'Khürelbaataryn Bulgantuya': 'person-066',
  'Enkhtaivany Bat-Amgalan': 'person-067',
  'Damdiny Tsogtbaatar': 'person-068',
  'Tsagaankhüügiin Iderbat': 'person-069',
  'Tserenpiliin Davaasüren': 'person-070',
  'Tsogtohiin Ayursaikhan': 'person-071',
  'Mönkhöögiin Oyuunchimeg': 'person-072',
  'Jamyankhorloogiin Sükhbaatar': 'person-073',
  'Khassuuri Gankhuyag': 'person-074',
  'Jambalyn Ganbaatar': 'person-075',
  'Saldangiin Odontuya': 'person-076',
  'Khishigiin Nyambatar': 'person-077',
  'Badarchiin Jargalmaa': 'person-078',
  'Dolgorsüren Sumiyabazar': 'person-079',
  'Enkhbayaryn Batshugar': 'person-080',
  'Pürev-Ochiir Anujin': 'person-081',
  'Ganibal Amartüvshin': 'person-082',
  'Dagvaayaangiin Sarantsetseg': 'person-083',
  'Togmid Dorjkhand': 'person-084',
  'Khaltmaagiin Battulga': 'person-085',
  'Dashzegviin Amarbayasgalan': 'person-086',
  'Luvslanjam Gantömör': 'person-087',
  'Khishigiin Nyambaatar': 'person-088',
}

// 2024-2028 Parliament members extracted from Wikipedia
// Format: [Mongolian name, English name, party, constituency, term#]
const PARLIAMENT_MEMBERS: Array<{
  mn: string
  en: string
  party: string
  constituency?: string
  term: number
  note?: string
}> = [
  // === PROVINCES ===
  // Constituency 1: Arkhangai, Bayankhongor, Övörkhangai
  { mn: 'Оюунсайханы Ангaramel', en: 'Oyunsaikhany Altangerel', party: 'DP', constituency: '1', term: 1 },
  { mn: 'Сайнхүүгийн Ганбаатар', en: 'Sainkhüügiin Ganbaatar', party: 'DP', constituency: '1', term: 3 },
  { mn: 'Батмөнхийн Батцэцэг', en: 'Battsetseg Batmunkh', party: 'MPP', constituency: '1', term: 1 },
  { mn: 'Пүрэвбаатарын Мөнхтулга', en: 'Pürevbaataryn Mönkhtulga', party: 'DP', constituency: '1', term: 1 },
  { mn: 'Дашдондогийн Ганбат', en: 'Dashdondogiin Ganbat', party: 'DP', constituency: '1', term: 3 },
  { mn: 'Ганзоригийн Тэмүүлэн', en: 'Ganzorigiin Temüülen', party: 'MPP', constituency: '1', term: 3 },
  { mn: 'Ганбатын Хосбаяр', en: 'Ganbatyn Khosbayar', party: 'DP', constituency: '1', term: 1 },
  { mn: 'Дамдинсүрэнгийн Жаргалсайхан', en: 'Damdinsürengiin Jargalsaikhan', party: 'DP', constituency: '1', term: 1 },
  { mn: 'Даваагийн Цогтбаатар', en: 'Davaagiin Tsogtbaatar', party: 'DP', constituency: '1', term: 1 },

  // Constituency 2: Govi-Altai, Khovd, Uvs, Zavkhan
  { mn: 'Сандагийн Бямбацогт', en: 'Sandagiin Byambatsogt', party: 'MPP', constituency: '2', term: 5 },
  { mn: 'Одонгийн Цогтгэрэл', en: 'Odongiin Tsogtgerel', party: 'DP', constituency: '2', term: 2 },
  { mn: 'Дашзэгвийн Амарбаясгалан', en: 'Dashzegviin Amarbayasgalan', party: 'MPP', constituency: '2', term: 1 },
  { mn: 'Бөхчулуун Пүрэвдорж', en: 'Bökhchuluuny Pürevdorj', party: 'DP', constituency: '2', term: 2 },
  { mn: 'Баттогтохын Чойжилсүрэн', en: 'Battogtokhyn Choijilsüren', party: 'MPP', constituency: '2', term: 5 },
  { mn: 'Банзрагчийн Түвшин', en: 'Banzragchiin Tüvshin', party: 'DP', constituency: '2', term: 1 },
  { mn: 'Очирباتын Амгаланбаатар', en: 'Ochirbatyn Amgalanbaatar', party: 'DP', constituency: '2', term: 1 },
  { mn: 'Батжаргалын Заяабал', en: 'Batjargalyn Zayaabal', party: 'MPP', constituency: '2', term: 1 },
  { mn: 'Загджавын Мэндсайхан', en: 'Zagdjavyn Mendsaikhan', party: 'MPP', constituency: '2', term: 1 },
  { mn: 'Энхбатын Болормаа', en: 'Enkhbatyn Bolormaa', party: 'MPP', constituency: '2', term: 1 },

  // Constituency 3: Bayan-Ölgii
  { mn: 'Хажыкбэрийн Жангабыл', en: 'Khajyekbyeriin Jangabyl', party: 'MPP', constituency: '3', term: 1 },
  { mn: 'Тильюханы Аубакар', en: 'Tilyeukhany Aubakir', party: 'MPP', constituency: '3', term: 2 },
  { mn: 'Буланы Бьэйсьэн', en: 'Bulany Byeisyen', party: 'DP', constituency: '3', term: 2 },

  // Constituency 4: Bulgan, Khövsgöl, Orkhon
  { mn: 'Халтмаагийн Батулга', en: 'Khaltmaagiin Battulga', party: 'DP', constituency: '4', term: 4, note: 'Former President 2017-2021. First ex-president to serve as MP.' },
  { mn: 'Лувсантсэрэнгийн Энх-Амгалан', en: 'Luvsantserengiin Enkh-Amgalan', party: 'MPP', constituency: '4', term: 4 },
  { mn: 'Дамбын Батлут', en: 'Dambyn Batlut', party: 'MPP', constituency: '4', term: 2 },
  { mn: 'Бат-Өлзийн Бат-Эрдэнэ', en: 'Bat-Ölziin Bat-Erdene', party: 'MPP', constituency: '4', term: 1 },
  { mn: 'Доржсүрэнгийн Үүриинтуяа', en: 'Dorjsürengiin Üüriintuyaa', party: 'MPP', constituency: '4', term: 1 },
  { mn: 'Лхагвын Мөнхбаатар', en: 'Lkhagvyn Mönkhbaatar', party: 'MPP', constituency: '4', term: 3 },
  { mn: 'Жадамбын Бат-Эрдэнэ', en: 'Jadambyn Bat-Erdene', party: 'MPP', constituency: '4', term: 3, note: 'MPP floor leader (June-Oct 2025), Deputy Speaker (Nov 2025-)' },
  { mn: 'Цэрэнпилийн Давааcүрэн', en: 'Tserenpiliin Davaasüren', party: 'MPP', constituency: '4', term: 5 },

  // Constituency 5: Darkhan-Uul, Selenge, Töv
  { mn: 'Болдын Жавхлан', en: 'Boldyn Javkhlan', party: 'MPP', constituency: '5', term: 3 },
  { mn: 'Цэвэгдоржийн Туваан', en: 'Tsevegdorjiin Tuvaan', party: 'DP', constituency: '5', term: 2 },
  { mn: 'Далайн Батбаяр', en: 'Dalain Batbayar', party: 'DP', constituency: '5', term: 1 },
  { mn: 'Жадамбын Энхбаяр', en: 'Jadambyn Enkhbayar', party: 'MPP', constituency: '5', term: 4 },
  { mn: 'Буяагийн Туул', en: 'Buyaagiin Tulga', party: 'MPP', constituency: '5', term: 1 },
  { mn: 'Гонгорын Дамдинням', en: 'Gongoryn Damdinnyam', party: 'MPP', constituency: '5', term: 2 },
  { mn: 'Сүхбаатарын Эрдэнэбөлд', en: 'Sükhbaataryn Erdenebold', party: 'DP', constituency: '5', term: 1 },
  { mn: 'Сүрэнжавын Лүндэг', en: 'Sürenjavyn Lündeg', party: 'MPP', constituency: '5', term: 1 },
  { mn: 'Чинбатын Ундрам', en: 'Chinbatyn Undram', party: 'MPP', constituency: '5', term: 2 },
  { mn: 'Жигжидийн Батжаргал', en: 'Jigjidiin Batjargal', party: 'MPP', constituency: '5', term: 2, note: 'MPP floor leader (Oct 2025-)' },

  // Constituency 6: Dornod, Khentii, Sükhbaatar
  { mn: 'Лувсаннамсрайн Оюун-Эрдэнэ', en: 'Luvsannamsrain Oyun-Erdene', party: 'MPP', constituency: '6', term: 3, note: 'PM 2021-2025, MPP Chair 2021-2025' },
  { mn: 'Мягмарсүрэнгийн Бадамсүрэн', en: 'Myagmarsürengiin Badamsüren', party: 'MPP', constituency: '6', term: 1 },
  { mn: 'Цагаанхүүгийн Идэрбат', en: 'Tsagaankhüügiin Iderbat', party: 'MPP', constituency: '6', term: 2 },
  { mn: 'Ухнаагийн Отгонбаяр', en: 'Ukhnaagiin Otgonbayar', party: 'MPP', constituency: '6', term: 1 },
  { mn: 'Лхагвасүрэнгийн Соронзонболд', en: 'Lkhagvasürengiin Soronzonbold', party: 'MPP', constituency: '6', term: 1 },
  { mn: 'Шинэбаярын Бямбасүрэн', en: 'Shinebayaryn Byambasüren', party: 'DP', constituency: '6', term: 1 },
  { mn: 'Мөнгөнцогийн Ганхүлэг', en: 'Möngöntsogiin Gankhüleg', party: 'MPP', constituency: '6', term: 1 },

  // Constituency 7: Dornogovi, Dundgovi, Govisümber, Ömnögovi
  { mn: 'Ренчинбямбын Сэддэрж', en: 'Renchinbyambyn Seddorj', party: 'DP', constituency: '7', term: 1 },
  { mn: 'Борхүүгийн Дэлгэрсайхан', en: 'Borkhüügiin Delgersaikhan', party: 'MPP', constituency: '7', term: 3 },
  { mn: 'Нанзадын Наранбаатар', en: 'Nanzadyn Naranbaatar', party: 'MPP', constituency: '7', term: 2 },
  { mn: 'Лувсанбямбаагийн Мөнхбаясгалан', en: 'Luvsanbyambaagiin Mönkhbayasgalan', party: 'DP', constituency: '7', term: 1 },
  { mn: 'Цагаанхүүгийн Мөнхбат', en: 'Tsagaankhüügiin Mönkhbat', party: 'DP', constituency: '7', term: 1 },
  { mn: 'Равжихийн Эрдэнэбүрэн', en: 'Ravjikhyn Erdenebüren', party: 'DP', constituency: '7', term: 2 },
  { mn: 'Гомбын Ганбаатар', en: 'Gombyn Ganbaatar', party: 'DP', constituency: '7', term: 1 },

  // === ULAANBAATAR ===
  // Constituency 8: Bayanzürkh
  { mn: 'Жигжидсүрэнгийн Чинбүрэн', en: 'Jigjidsürengiin Chinbüren', party: 'MPP', constituency: '8', term: 2 },
  { mn: 'Баттөмөрийн Энхбаяр', en: 'Battömöriin Enkhbayar', party: 'MPP', constituency: '8', term: 2 },
  { mn: 'Пүрэвсүрэнгийн Наранбаяр', en: 'Pürevsürengiin Naranbayar', party: 'HUN Party', constituency: '8', term: 1 },
  { mn: 'Энхтайваны Бат-Амгалан', en: 'Enkhtaivany Bat-Amgalan', party: 'MPP', constituency: '8', term: 2 },
  { mn: 'Хүрэлбаатарын Булгантуяа', en: 'Khürelbaataryn Bulgantuya', party: 'MPP', constituency: '8', term: 2, note: 'Deputy Speaker until Nov 2025' },

  // Constituency 9: Bayangol
  { mn: 'Жаргалсайханы Золжаргал', en: 'Jargalsaikhany Zoljargal', party: 'HUN Party', constituency: '9', term: 1, note: 'Left HUN Party Dec 2025, became independent' },
  { mn: 'Хассуурийн Ганхуяг', en: 'Khassuuri Gankhuyag', party: 'MPP', constituency: '9', term: 2 },
  { mn: 'Жамбалын Ганбаатар', en: 'Jambalyn Ganbaatar', party: 'MPP', constituency: '9', term: 3 },

  // Constituency 10: Chingeltei, Sükhbaatar
  { mn: 'Ням-Осорын Учрал', en: 'Nyam-Osoryn Uchral', party: 'MPP', constituency: '10', term: 3 },
  { mn: 'Отгоншарын Батнайрамдал', en: 'Otgonsharyn Batnairamdal', party: 'MPP', constituency: '10', term: 1 },
  { mn: 'Цэндийн Баатархүү', en: 'Tsendiin Baatarkhüü', party: 'DP', constituency: '10', term: 1 },
  { mn: 'Натсагдоржийн Батсүмбэрэл', en: 'Natsagdorjiin Batsümberel', party: 'MPP', constituency: '10', term: 1 },
  { mn: 'Дамдины Цогтбаатар', en: 'Damdiny Tsogtbaatar', party: 'MPP', constituency: '10', term: 3 },
  { mn: 'Хөххүүгийн Болормаа', en: 'Khökhkhüügiin Bolormaa', party: 'DP', constituency: '10', term: 1 },

  // Constituency 11: Songino Khairkhan
  { mn: 'Энхбаярын Батшугар', en: 'Enkhbayaryn Batshugar', party: 'MPP', constituency: '11', term: 2 },
  { mn: 'Норовын Алтанхуяг', en: 'Norovyn Altankhuyag', party: 'DP', constituency: '11', term: 5 },
  { mn: 'Наранцэцэгийн Алтаншагай', en: 'Narantsetsegiin Altanshagai', party: 'MPP', constituency: '11', term: 1 },
  { mn: 'Пүрэвжавын Сайнзorig', en: 'Pürevjavyn Sainzorig', party: 'MPP', constituency: '11', term: 1 },
  { mn: 'Чинбатын Номин', en: 'Chinbatyn Nomin', party: 'MPP', constituency: '11', term: 1 },

  // Constituency 12: Khan Uul
  { mn: 'Тогтмолын Мөнхсайхан', en: 'Togtmolyn Mönkhsaikhan', party: 'MPP', constituency: '12', term: 1 },
  { mn: 'Чулуунбилигийн Лодойсамбуу', en: 'Chuluunbilegiin Lodoisambuu', party: 'DP', constituency: '12', term: 1 },
  { mn: 'Жуковын Алдаржавхлан', en: 'Jukovyn Aldarjavkhlan', party: 'MPP', constituency: '12', term: 1 },

  // Constituency 13: Bagakhangai, Baganuur, Nalaikh
  { mn: 'Сайнбуянгийн Амарсайхан', en: 'Sainbuyangiin Amarsaikhan', party: 'MPP', constituency: '13', term: 2 },
  { mn: 'Цэндийн Сандаг-Очир', en: 'Tsendiin Sandag-Ochir', party: 'MPP', constituency: '13', term: 2 },

  // === PROPORTIONAL REPRESENTATION ===
  // MPP PR list
  { mn: 'Ганзоригийн Лувсанжамц', en: 'Ganzorigiin Luvsanjamts', party: 'MPP', term: 1 },
  { mn: 'Мөнхчулууны Энхцэцэг', en: 'Mönkhchuluuny Enkhtsetseg', party: 'MPP', term: 1 },
  { mn: 'Чинбаатарын Анар', en: 'Chinbaataryn Anar', party: 'MPP', term: 1 },
  { mn: 'Отгоны Саранчулун', en: 'Otgony Saranchuluun', party: 'MPP', term: 1 },
  { mn: 'Дүгэрийн Рэгдэл', en: 'Dügeriin Regdel', party: 'MPP', term: 1 },
  { mn: 'Даваасамбуугийн Ганмаа', en: 'Davaasambuugiin Ganmaa', party: 'MPP', term: 1 },
  { mn: 'Сүхбаатарын Эрдэнэбат', en: 'Sükhbaataryn Erdenebat', party: 'MPP', term: 1 },
  { mn: 'Мэндбаярын Мандхай', en: 'Mendbayaryn Mandkhai', party: 'MPP', term: 1 },
  { mn: 'Дашцэрэнгийн Энхтүвшин', en: 'Dashtserengiin Enkhtüvshin', party: 'MPP', term: 1 },
  { mn: 'Болдын Уянга', en: 'Boldyn Uyanga', party: 'MPP', term: 1 },
  { mn: 'Жанчивын Галбадрах', en: 'Janchivyn Galbadrakh', party: 'MPP', term: 1 },
  { mn: 'Лхагвасүрэнгийн Бямбадорж', en: 'Lkhagvasürengiin Byambadorj', party: 'MPP', term: 1 },
  { mn: 'Дамбадаржaa Батмөнх', en: 'Dambadarjaa Batmunkh', party: 'MPP', term: 1 },
  { mn: 'Дашзэгвийн Батбаяр', en: 'Dashzegviin Batbayar', party: 'MPP', term: 1 },
  { mn: 'Сүрэнцэцэгийн Нямжав', en: 'Sürentsegei Nyamjav', party: 'MPP', term: 1 },
  { mn: 'Цэнгэлийн Одончимэг', en: 'Tsengeliin Odontsetseg', party: 'MPP', term: 1 },
  { mn: 'Ганболдын Сүрэнжаргал', en: 'Ganboldyn Sürenjargal', party: 'MPP', term: 1 },
  { mn: 'Бямбадоржийн Мөнхбат', en: 'Byambadorjiin Mönkhbat', party: 'MPP', term: 1 },

  // DP PR list
  { mn: 'Одонгийн Цогтгэрэл', en: 'Odongiin Tsogtgerel', party: 'DP', term: 2, note: 'DP floor leader' },
  { mn: 'Лувсанням Гантөмөр', en: 'Luvslanjam Gantömör', party: 'DP', term: 1 },
  { mn: 'Гомпилдоогийн Мөнхцэцэг', en: 'Gompilodogii Mönkh-Tsetseg', party: 'DP', term: 1 },
  { mn: 'Хаянгаагийн Болорчулуун', en: 'Khayaangaagiin Bolorchuluun', party: 'DP', term: 1 },
  { mn: 'Тэмөртэгоогийн Энхтүвшин', en: 'Tömörtögoogii Enkhtüvshin', party: 'DP', term: 1 },
  { mn: 'Няамаагийн Энхболд', en: 'Nyaamaagiin Enkhbold', party: 'DP', term: 1 },
  { mn: 'Шатарбалын Раднаасэд', en: 'Shatarbaly Radnaased', party: 'DP', term: 1 },
  { mn: 'Сүхбаатарын Батболд', en: 'Sükhbaataryn Batbold', party: 'DP', term: 1 },
  { mn: 'Бадманьямбуугийн Бат-Эрдэнэ', en: 'Badmanyambuugii Bat-Erdene', party: 'DP', term: 1 },
  { mn: 'Цэндийн Мөнх-Оргил', en: 'Tsendiin Mönkh-Orgil', party: 'DP', term: 1 },
  { mn: 'Пурэв-Очирын Анужин', en: 'Pürev-Ochiir Anujin', party: 'DP', term: 1 },
  { mn: 'Салдангийн Одонтуяа', en: 'Saldangiin Odontuya', party: 'DP', term: 1 },
  { mn: 'Бадарчийн Жаргалмаа', en: 'Badarchiin Jargalmaa', party: 'DP', term: 1 },
  { mn: 'Дагвааянцангийн Саранцэцэг', en: 'Dagvaayaangiin Sarantsetseg', party: 'DP', term: 1 },
  { mn: 'Ганибалын Амартүвшин', en: 'Ganibal Amartüvshin', party: 'DP', term: 1 },
  { mn: 'Тогмидын Доржханд', en: 'Togmid Dorjkhand', party: 'DP', term: 1 },

  // HUN Party PR list
  { mn: 'Хишгээгийн Нямбаатар', en: 'Khishigiin Nyambatar', party: 'HUN Party', term: 1 },
  { mn: 'Ширнэнбанидийн Адишаа', en: 'Shirnembanidiin Adishaa', party: 'HUN Party', term: 1 },
  { mn: 'Хүрэлбаатарын Булгантуяа', en: 'Khürelbaataryn Bulgantuya', party: 'HUN Party', term: 1 },
  { mn: 'Дамсүрэнгийн Өнөрболор', en: 'Damsürengiin Örönbolor', party: 'HUN Party', term: 1 },
  { mn: 'Мөнхөөгийн Оюунчимэг', en: 'Mönkhöögiin Oyuunchimeg', party: 'HUN Party', term: 1 },
  { mn: 'Сүрэнжавын Баясгалан', en: 'Sürenjavyn Bayasgalan', party: 'HUN Party', term: 1 },
  { mn: 'Бадамхүүгийн Эрдэнэцэцэг', en: 'Badamkhüügiin Erdentsetseg', party: 'HUN Party', term: 1 },

  // National Coalition PR list
  { mn: 'Цэдэндамбын Цэрэнпунцаг', en: 'Tsedenambiin Tserenpuntsag', party: 'National Coalition', term: 1 },
  { mn: 'Балжинням Баярсайхан', en: 'Baljinnyam Bayarsaikhan', party: 'National Coalition', term: 1 },
  { mn: 'Содномын Чинзориг', en: 'Sodnomiin Chinzorig', party: 'National Coalition', term: 1 },
  { mn: 'Дуламдоржийн Тогтохсүрэн', en: 'Dulamdorjiin Togtohsüren', party: 'National Coalition', term: 1 },

  // Civil Will-Green Party PR list
  { mn: 'Гочоогийн Ганболд', en: 'Gochuugiin Ganbold', party: 'Civil Will-Green Party', term: 1 },
  { mn: 'Цэрэнпилийн Давааcүрэн', en: 'Tserenpiliin Davaasüren', party: 'Civil Will-Green Party', term: 1 },
  { mn: 'Лхагвын Мөнхбаатар', en: 'Lkhagvyn Mönkhbaatar', party: 'Civil Will-Green Party', term: 1 },
  { mn: 'Хүрэлбаатарын Баясгалан', en: 'Khürelbaataryn Bayasgalan', party: 'Civil Will-Green Party', term: 1 },
]

// Special roles / notes
const ROLE_NOTES: Record<string, string> = {
  'person-010': 'УИХ-ын дарга (2026 оны 4-өөс). МАН. 5 дахь удаагаа УИХ-ын гишүүн.',
  'person-086': 'МАН-ын НБН (2025). УИХ-ын дарга (2025 оны 10-11). МАН-ын нэр дэвших 2024 онд.',
  'person-085': 'Монгол Улсын Ерөнхийлөгч (2017-2021). АН. Анхны Ерөнхийлөгчөөсөө УИХ-д суусан.',
  'person-065': 'УИХ-ын гишүүн. МАН.',
}

function main() {
  const nodes: Node[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'nodes.json'), 'utf8'))
  const edges: Edge[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'edges.json'), 'utf8'))

  let nextId = nodes.length + 1
  const newNodes: Node[] = []
  const newEdges: Edge[] = []
  let edgesAdded = 0

  // 1. Create party nodes if not exist
  for (const [partyName, nodeId] of Object.entries(PARTY_IDS)) {
    if (!nodes.find(n => n.id === nodeId) && !newNodes.find(n => n.id === nodeId)) {
      newNodes.push({
        id: nodeId,
        name: PARTY_NAMES[partyName],
        type: 'government_body',
        description: `${partyName} political party in Mongolia`,
        aliases: [partyName],
        importance: partyName === 'MPP' ? 90 : partyName === 'DP' ? 80 : 60,
      })
    }
  }

  // 2. Add parliament member nodes and edges
  for (const member of PARLIAMENT_MEMBERS) {
    // Check if already exists
    let nodeId = NAME_TO_ID[member.en] || NAME_TO_ID[member.mn]

    if (!nodeId) {
      // Check by partial name match
      const existing = nodes.find(n =>
        n.aliases?.some(a => a === member.en || a === member.mn) ||
        n.name === member.mn
      )
      if (existing) nodeId = existing.id
    }

    if (!nodeId) {
      // Create new node
      nodeId = `person-${String(nextId).padStart(3, '0')}`
      nextId++

      const node: Node = {
        id: nodeId,
        name: member.mn,
        type: 'person',
        subtype: 'politician',
        role_title: `УИХ-ын гишүүн (${member.constituency ? `Тойрог ${member.constituency}`: 'Улсын нэмэлт'}), ${member.party}`,
        description: `${member.en}. Монгол Улсын 2024-2028 оны УИХ-ын гишүүн.`,
        aliases: [member.en],
        importance: member.note ? 75 : 65,
      }

      if (member.note) {
        node.description += ` ${member.note}`
      }

      newNodes.push(node)
      NAME_TO_ID[member.en] = nodeId
      NAME_TO_ID[member.mn] = nodeId
    }

    // Update role title if this is a known person
    if (ROLE_NOTES[nodeId]) {
      const existingNode = nodes.find(n => n.id === nodeId) || newNodes.find(n => n.id === nodeId)
      if (existingNode) {
        existingNode.role_title = ROLE_NOTES[nodeId]
      }
    }

    // 3. Add party affiliation edge (if not already exists)
    const partyId = PARTY_IDS[member.party]
    const partyEdgeExists = edges.some(e =>
      e.from === nodeId && e.to === partyId && e.relationship_type === 'political_affiliation'
    ) || newEdges.some(e =>
      e.from === nodeId && e.to === partyId && e.relationship_type === 'political_affiliation'
    )

    if (!partyEdgeExists && partyId) {
      newEdges.push({
        id: `edge-party-${nodeId}-${partyId}`,
        from: nodeId,
        to: partyId,
        relationship_type: 'political_affiliation',
        confidence: 'documented',
        evidence: [WIKI_EVIDENCE],
        date_range: { from: '2024-07-02' },
      })
      edgesAdded++
    }

    // 4. Add member_of parliament edge (if not already exists)
    const parliamentEdgeExists = edges.some(e =>
      e.from === nodeId && e.to === 'agency-003' && e.relationship_type === 'employment'
    ) || newEdges.some(e =>
      e.from === nodeId && e.to === 'agency-003' && e.relationship_type === 'employment'
    )

    if (!parliamentEdgeExists) {
      newEdges.push({
        id: `edge-sgh-${nodeId}`,
        from: nodeId,
        to: 'agency-003',
        relationship_type: 'employment',
        confidence: 'documented',
        evidence: [WIKI_EVIDENCE],
        date_range: { from: '2024-07-02', to: '2028-07-02' },
      })
      edgesAdded++
    }
  }

  // Merge and write
  const allNodes = [...nodes, ...newNodes]
  const allEdges = [...edges, ...newEdges]

  fs.writeFileSync(path.join(DATA_DIR, 'nodes.json'), JSON.stringify(allNodes, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'edges.json'), JSON.stringify(allEdges, null, 2))

  console.log(`Added ${newNodes.length} new nodes (${allNodes.length} total)`)
  console.log(`Added ${edgesAdded} new edges (${allEdges.length} total)`)
  console.log(`Party nodes: ${newNodes.filter(n => n.id.startsWith('party-')).length}`)
  console.log(`Person nodes added: ${newNodes.filter(n => n.id.startsWith('person-')).length}`)
}

main()
