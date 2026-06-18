#!/usr/bin/env python3
"""
Generate comprehensive parliament member data for 2019-2026.
Sources: Wikipedia lists of 2020-2024 and 2024-2028 State Great Khural members.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: Load existing data
# ──────────────────────────────────────────────────────────────────────────────
with open(DATA_DIR / "entities.json") as f:
    entities = json.load(f)
with open(DATA_DIR / "relationships.json") as f:
    relationships = json.load(f)
with open(DATA_DIR / "sources.json") as f:
    sources = json.load(f)
with open(DATA_DIR / "evidence.json") as f:
    evidence = json.load(f)
with open(DATA_DIR / "changelog.json") as f:
    changelog = json.load(f)

# Map name → existing id
existing_ids = {e["id"] for e in entities}
# Key: normalized name → person id
existing_by_name = {}
for e in entities:
    existing_by_name[e["name"]] = e["id"]
    for a in e.get("aliases", []):
        existing_by_name[a] = e["id"]

# Next available IDs
def next_person_id():
    nums = [int(e["id"].split("-")[1]) for e in entities if e["id"].startswith("person-")]
    return max(nums) + 1 if nums else 1

def next_rel_id():
    nums = [int(r["id"].split("-")[1]) for r in relationships if r["id"].startswith("rel-")]
    return max(nums) + 1 if nums else 1

def next_org_id():
    nums = [int(e["id"].split("-")[1]) for e in entities if e["id"].startswith("org-")]
    return max(nums) + 1 if nums else 1

def next_ev_id():
    nums = [int(e["id"].split("-")[1]) for e in evidence if e["id"].startswith("ev-")]
    return max(nums) + 1 if nums else 1

def next_cl_id():
    nums = [int(c["id"].split("-")[1]) for c in changelog if c["id"].startswith("cl-")]
    return max(nums) + 1 if nums else 1

def next_src_id():
    nums = [int(s["id"].split("-")[1]) for s in sources if s["id"].startswith("source-")]
    return max(nums) + 1 if nums else 1


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: Define parliament member data
# Format: (romanized_name, mongolian_name, party_key, born, notes, importance)
# party_key: "MPP", "DP", "HUN", "NC", "CWGP", "IND"
# ──────────────────────────────────────────────────────────────────────────────

PARTY_ORG_ID = {
    "MPP": "org-001",
    "DP":  "org-002",
    "HUN": "org-003",
    "NC":  None,   # National Coalition — to be added as org-004
    "CWGP": None,  # Civil Will–Green Party — to be added as org-005
    "IND": None,
    "RPEC": None,  # Right Person Electorate Coalition
    "OUR": None,   # Our Coalition
}

# ── 2020-2024 parliament (76 original seats) ──────────────────────────────────
# Already in entities: Khurelsukh(001), Oyun-Erdene(003), Uchral(006),
# Battsetseg(007-but 2024 parliament), Damdinjav(009), Byambatsogt(010),
# Erdenebat(011), Zandanshatar(012), Enkhbayar(008)
SKIP_2020 = {
    "Ukhnaagiin Khürelsükh": "person-001",
    "Ухнаагийн Хүрэлсүх": "person-001",
    "Luvsannamsrain Oyun-Erdene": "person-003",
    "Лувсаннамсрайн Оюун-Эрдэнэ": "person-003",
    "Nyam-Osoryn Uchral": "person-006",
    "Няморсрын Учрал": "person-006",
    "Nyam-Osoryn Uchral": "person-006",
    "Gongoryn Damdinnyam": "person-009",
    "Гонгорын Дамдинням": "person-009",
    "Sandagiin Byambatsogt": "person-010",
    "Сандагийн Бямбацогт": "person-010",
    "Jargaltulgyn Erdenebat": "person-011",
    "Жаргалтулгын Эрдэнэбат": "person-011",
    "Gombojavyn Zandanshatar": "person-012",
    "Гомбожавын Занданшатар": "person-012",
    "Jadambyn Enkhbayar": "person-008",
    "Жадамбын Энхбаяр": "person-008",
}

# Full 2020 parliament member list (romanized_name, mongolian, party, born, constituency, importance)
MEMBERS_2020 = [
    # 1st Arkhangai (3 seats)
    ("Yondonperenlein Baatarbileg", "Ёндонпэрэнлэйн Баатарбилэг", "MPP", None, "Архангай", 40),
    ("Jamyangiin Mönkhbat", "Жамьяангийн Мөнхбат", "MPP", None, "Архангай", 38, "2023 оны 3 дугаар сарын 23-нд огцорсон."),
    ("Ganzorigiin Temüülen", "Ганзоригийн Тэмүүлэн", "MPP", 1973, "Архангай", 42),
    # 2nd Bayan-Ölgii (3 seats)
    ("Khavdislamyn Badyelkhan", "Хавдисламын Бадьелхан", "MPP", None, "Баян-Өлгий", 38),
    ("Tyelukhany Aubakar", "Тьэлухань Аубакар", "MPP", 1976, "Баян-Өлгий", 38),
    ("Bulany Byeisyen", "Буланы Бьэйсьэн", "DP", 1963, "Баян-Өлгий", 38),
    # 3rd Bayankhongor (3 seats) - Zandanshatar(012) already in
    ("Dashdondogiin Ganbat", "Дашдондогийн Ганбат", "DP", None, "Баянхонгор", 42),
    ("Amgalangiin Adiyaasüren", "Амгалангийн Адъяасүрэн", "DP", None, "Баянхонгор", 40),
    # 4th Bulgan (2 seats)
    ("Tsogt-Ochiryn Anandbazar", "Цогт-Очирын Анандбазар", "MPP", None, "Булган", 40),
    ("Jadambyn Bat-Erdene", "Жадамбын Бат-Эрдэнэ", "MPP", 1965, "Булган", 45),
    # 5th Govi-Altai (2 seats)
    ("Byambasürengiin Enkh-Amgalan", "Бямбасүрэнгийн Энх-Амгалан", "MPP", None, "Говь-Алтай", 40),
    ("Shatarbalyn Radnaased", "Шатарбалын Раднаасэд", "MPP", None, "Говь-Алтай", 38),
    # 6th Dundgovi Govisümber (2 seats)
    ("Sükhbaataryn Batbold", "Сүхбаатарын Батболд", "MPP", None, "Дундговь Говьсүмбэр", 42),
    ("Gompildoogiin Mönkhtsetseg", "Гомпилдоогийн Мөнхцэцэг", "MPP", None, "Дундговь Говьсүмбэр", 40),
    # 7th Dornod (2 seats)
    ("Khayangaagiin Bolorchuluun", "Хаянгаагийн Болорчулуун", "MPP", None, "Дорнод", 40),
    ("Tsedeviin Sergelen", "Цэдэвийн Сэргэлэн", "MPP", None, "Дорнод", 40),
    # 8th Dornogovi (2 seats)
    ("Borkhüügiin Delgersaikhan", "Борхүүгийн Дэлгэрсайхан", "MPP", 1964, "Дорноговь", 42),
    ("Tömörtogoogiin Enkhtüvshin", "Тэмөртэгоогийн Энхтүвшин", "MPP", None, "Дорноговь", 40),
    # 9th Zavkhan (2 seats)
    ("Tsedendambyn Tserenpuntsag", "Цэдэндамбын Цэрэнпунцаг", "MPP", None, "Завхан", 38),
    ("Baljinnyamyn Bayarsaikhan", "Балжинням Баярсайхан", "MPP", None, "Завхан", 38),
    # 10th Övörkhangai (3 seats)
    ("Sodnomyn Chinzorig", "Содномын Чинзориг", "MPP", None, "Өвөрхангай", 42),
    ("Dulamdorjiin Togtokhsüren", "Дуламдоржийн Тогтохсүрэн", "MPP", None, "Өвөрхангай", 45),
    ("Gochoogiin Ganbold", "Гочоогийн Ганболд", "MPP", None, "Өвөрхангай", 40),
    # 11th Ömnögovi (2 seats)
    ("Nanzadyn Naranbaatar", "Нанзадын Наранбаатар", "MPP", None, "Өмнөговь", 42),
    ("Dashdembereliin Bat-Erdene", "Дашдэмбэрэлийн Бат-Эрдэнэ", "DP", None, "Өмнөговь", 42),
    # 12th Sükhbaatar (2 seats)
    ("Jambyn Batsuuri", "Жамбын Батсуурь", "DP", 1971, "Сүхбаатар", 42),
    ("Nayantain Ganibal", "Наянтайн Ганибал", "DP", None, "Сүхбаатар", 40),
    # 13th Selenge (3 seats) - Erdenebat(011) already in
    ("Chinbatyn Undram", "Чинбатын Ундрам", "MPP", 1982, "Сэлэнгэ", 42),
    ("Damdinsürengiin Önörbolor", "Дамдинсүрэнгийн Өнөрболор", "MPP", None, "Сэлэнгэ", 40),
    # 14th Töv (3 seats)
    ("Jigjidiin Batjargal", "Жигжидийн Батжаргал", "MPP", 1967, "Төв", 45),
    ("Tsevegdorjiin Tuvaan", "Цэвэгдоржийн Туваан", "DP", 1972, "Төв", 42),
    ("Nyamaagiin Enkhbold", "Няамаагийн Энхболд", "MPP", None, "Төв", 45),
    # 15th Uvs (3 seats)
    ("Odongiin Tsogtgerel", "Одонгийн Цогтгэрэл", "DP", None, "Увс", 48),
    ("Chimediin Khürelbaatar", "Чимэдийн Хүрэлбаатар", "MPP", None, "Увс", 42),
    ("Battogtokhyn Choijilsüren", "Баттогтохын Чойжилсүрэн", "MPP", 1970, "Увс", 42),
    # 16th Khovd (3 seats) - Byambatsogt(010) already in
    ("Shirnenbanidiin Adishaa", "Ширнэнбанидийн Адишаа", "DP", None, "Ховд", 40),
    ("Bökhchuluuny Pürevdorj", "Бөхчулуун Пүрэвдорж", "DP", 1973, "Ховд", 45),
    # 17th Khövsgöl (3 seats)
    ("Tserenpiliin Davaasüren", "Цэрэнпилийн Давааcүрэн", "MPP", 1964, "Хөвсгөл", 42),
    ("Lkhagvyn Mönkhbaatar", "Лхагвын Мөнхбаатар", "MPP", 1977, "Хөвсгөл", 48),
    ("Luvsantserengiin Enkh-Amgalan", "Лувсантсэрэнгийн Энх-Амгалан", "MPP", 1970, "Хөвсгөл", 45),
    # 18th Khentii (3 orig; Khurelsukh→Iderbat, Oyun-Erdene, Badmaanyambuugiin Bat-Erdene)
    # Khurelsukh(001) and Oyun-Erdene(003) already in
    ("Badmaanyambuugiin Bat-Erdene", "Бадманьямбуугийн Бат-Эрдэнэ", "MPP", None, "Хэнтий", 40),
    # Replacement: Tsagaankhüügiin Iderbat
    ("Tsagaankhüügiin Iderbat", "Цагаанхүүгийн Идэрбат", "MPP", 1981, "Хэнтий", 42),
    # 19th Darkhan-Uul (3 seats) - Damdinjav(009) already in
    ("Boldyn Javkhlan", "Болдын Жавхлан", "MPP", 1975, "Дархан-Уул", 45),
    ("Baagaagiin Battömör", "Баагаагийн Баттөмөр", "MPP", None, "Дархан-Уул", 40),
    # 20th Orkhon (3 seats)
    ("Dambyn Batlut", "Дамбын Батлут", "MPP", 1974, "Орхон", 42),
    ("Norovyn Altankhuyag", "Норовын Алтанхуяг", "IND", 1958, "Орхон", 65, "Хуучин Ерөнхий сайд (2012-2014). ДН-ын хуучин дарга."),
    ("Sainkhüügiin Ganbaatar", "Сайнхүүгийн Ганбаатар", "OUR", None, "Орхон", 48, "Манай Эвслийн нэр дэвшигч, дараа нь ДН-д нэгдсэн."),
    # 21st UB Bagakhangai Baganuur Nalaikh (2 seats)
    ("Sainbuyangiin Amarsaikhan", "Сайнбуянгийн Амарсайхан", "MPP", 1973, "УБ Багахангай Багануур Налайх", 42),
    ("Tsendiin Sandag-Ochir", "Цэндийн Сандаг-Очир", "MPP", 1977, "УБ Багахангай Багануур Налайх", 42),
    # 22nd UB Bayanzürkh (2 seats)
    ("Battömöriin Enkhbayar", "Баттөмөрийн Энхбаяр", "MPP", 1977, "УБ Баянзүрх", 42),
    ("Batsükhiin Saranchimeg", "Батсүхийн Саранчимэг", "MPP", None, "УБ Баянзүрх", 40),
    # 23rd UB Bayanzürkh (3 seats)
    ("Jigjidsürengiin Chinbüren", "Жигждсүрэнгийн Чинбүрэн", "MPP", 1972, "УБ Баянзүрх", 42),
    ("Khürelbaataryn Bulgantuya", "Хүрэлбаатарын Булгантуяа", "MPP", 1981, "УБ Баянзүрх", 42),
    ("Enkhtaivany Bat-Amgalan", "Энхтайваны Бат-Амгалан", "MPP", 1977, "УБ Баянзүрх", 42),
    # 24th UB Sükhbaatar (3 seats)
    ("Damdiny Tsogtbaatar", "Дамдины Цогтбаатар", "MPP", 1970, "УБ Сүхбаатар", 45),
    ("Tsendiin Mönkh-Orgil", "Цэндийн Мөнх-Оргил", "MPP", None, "УБ Сүхбаатар", 42),
    ("Tserenjamtsyn Mönkhtsetseg", "Цэрэнжамцын Мөнхцэцэг", "MPP", None, "УБ Сүхбаатар", 40),
    # 25th UB Chingeltei (3 seats)
    ("Tömörbaataryn Ayuursaikhan", "Тэморбаатарын Аюурсайхан", "MPP", None, "УБ Чингэлтэй", 42),
    ("Mönkhöögiin Oyuunchimeg", "Мөнхөөгийн Оюунчимэг", "MPP", None, "УБ Чингэлтэй", 40),
    ("Jamiyankhorloogiin Sükhbaatar", "Жамьянхорлоогийн Сүхбаатар", "MPP", None, "УБ Чингэлтэй", 40),
    # 26th UB Bayangol (3 seats)
    ("Khassuuriin Gankhuyag", "Хассуурийн Ганхуяг", "MPP", 1977, "УБ Баянгол", 42),
    ("Jambalyn Ganbaatar", "Жамбалын Ганбаатар", "MPP", 1973, "УБ Баянгол", 42),
    ("Saldangiin Odontuyaa", "Салдангийн Одонтуяа", "DP", 1964, "УБ Баянгол", 45),
    # 27th UB Songino Khairkhan (2 seats)
    ("Khishgeegiin Nyambaatar", "Хишгээгийн Нямбаатар", "MPP", None, "УБ Сонгинохайрхан", 42, "2023 оны 10 дугаар сарын 12-нд Улаанбаатарын дарга болсон."),
    ("Badarchiin Jargalmaa", "Бадарчийн Жаргалмаа", "MPP", None, "УБ Сонгинохайрхан", 40),
    # 28th UB Songino Khairkhan (3 orig) - Uchral(006) already in
    ("Dolgorsürengiin Sumyaabazar", "Дологрсүрэнгийн Сумьяабазар", "MPP", None, "УБ Сонгинохайрхан", 40, "2020 оны 10 дугаар сарын 23-нд Улаанбаатарын дарга болсон."),
    ("Enkhbayaryn Batshugar", "Энхбаярын Батшугар", "MPP", 1987, "УБ Сонгинохайрхан", 40, "2021 оны 10 дугаар сарын 21-нд Сумьяабазарыг орлосон."),
    ("Purev-Ochiryn Anujin", "Пурэв-Очирын Анужин", "MPP", None, "УБ Сонгинохайрхан", 40),
    # 29th UB Khan-Uul (3 seats)
    ("Ganibalyn Amartüvshin", "Ганибалын Амартүвшин", "MPP", None, "УБ Хан-Уул", 40),
    ("Davaajantsangiin Sarangerel", "Дагвааянцангийн Саранцэцэг", "MPP", None, "УБ Хан-Уул", 40),
    ("Togmidyn Dorjkhand", "Тогмидын Доржханд", "RPEC", None, "УБ Хан-Уул", 42),
]

# Notable 2024-ONLY additions (not in 2020 list but significant)
MEMBERS_2024_NEW = [
    # Former President Battulga (huge political figure)
    ("Khaltmaagiin Battulga", "Халтмаагийн Батулга", "DP", 1963, "Булган/Хөвсгөл/Орхон (4-р тойрог)", 85,
     "Монгол Улсын 5 дахь Ерөнхийлөгч (2017–2021). ДН-аас 2024 онд УИХ-д сонгогдсон. Монголын улс төрийн гол баатруудын нэг."),
    # Amarbayasgalan — Speaker 2024-2025
    ("Dashzegviin Amarbayasgalan", "Дашзэгвийн Амарбаясгалан", "MPP", 1981, "Говь-Алтай/Ховд/Увс/Завхан (2-р тойрог)", 72,
     "УИХ-ын дарга 2024 оны 7 дугаар сараас 2025 оны 10 дугаар сар хүртэл. МАН-ын гишүүн."),
    # DP opposition leader
    ("Luvsannyamyn Gantömör", "Лувсанням Гантөмөр", "DP", 1973, "ДН-ын нийтийн жагсаалт (1-р байр)", 65,
     "УИХ дахь ДН-ын бүлгийн дарга 2023–2025. 2004 оноос УИХ-д гурвантаа сонгогдсон."),
    # Batmönkhiin Battsetseg — already person-007 in entities but as minister;
    # she was elected MP in 2024 for the first time
    # We'll skip adding her as new entity since she's already person-007
    # Khaltmaagiin Battulga's Former Presidency
]

# ── Add new parties as organizations ─────────────────────────────────────────
NEW_ORGS = [
    {
        "id": "org-004",
        "name": "Үндэсний Эвсэл (Монгол Ногоон Нам + МҮДН)",
        "type": "organization",
        "description": "2024 оны УИХ-ын сонгуульд 4 суудал авсан үндэсний эвсэл (Монгол Ногоон Нам болон Монгол Үндэсний Ардчилсан Нам нэгдэн байгуулсан). Нийтийн жагсаалтын 4 суудал авсан.",
        "aliases": ["National Coalition", "Mongolian Green Party coalition"],
        "tags": ["coalition", "parliament-2024"],
        "importance": 50,
        "confidence": 100,
        "sourceIds": ["source-014"],
        "createdAt": "2024-07-02T00:00:00Z",
        "updatedAt": "2024-07-02T00:00:00Z"
    },
    {
        "id": "org-005",
        "name": "Иргэний Зориг-Ногоон Нам",
        "type": "organization",
        "description": "2024 оны УИХ-ын сонгуульд нийтийн жагсаалтаар 4 суудал авсан иргэний улс төрийн нам. 1990-ээд онд байгуулагдсан.",
        "aliases": ["Civil Will–Green Party", "CWGP", "ИЗНН"],
        "tags": ["party", "parliament-2024"],
        "importance": 50,
        "confidence": 100,
        "sourceIds": ["source-014"],
        "createdAt": "2024-07-02T00:00:00Z",
        "updatedAt": "2024-07-02T00:00:00Z"
    },
    {
        "id": "org-006",
        "name": "ХҮН Нам",
        "type": "organization",
        "description": "2024 оны УИХ-д 8 суудал авсан (1 гишүүн намаасаа 2025 онд гарсан тул 7 болсон). Ерөнхий сайд Учралын коалицид орсон.",
        "aliases": ["HUN Party", "Hün Nam"],
        "tags": ["party", "parliament-2024"],
        "importance": 55,
        "confidence": 100,
        "sourceIds": ["source-014"],
        "createdAt": "2024-07-02T00:00:00Z",
        "updatedAt": "2024-07-02T00:00:00Z"
    },
]
# Note: org-003 was previously HUN Party — but let's check entities.json...
# Actually org-003 in entities.json was "ХҮН Нам" already!
# So we should update it rather than add org-006. Let's skip org-006.

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: Build new entities
# ──────────────────────────────────────────────────────────────────────────────
new_entities = []
person_counter = next_person_id()

# name_to_id: romanized name → entity id (for generating relationships)
name_to_id = {}

# Update skip map with Mongolian name variations we know
SKIP_NAMES_ROM = set(SKIP_2020.keys())

def add_member(rom_name, mn_name, party, born, constituency, importance, notes=""):
    global person_counter
    if rom_name in SKIP_NAMES_ROM:
        pid = SKIP_2020[rom_name]
        name_to_id[rom_name] = pid
        name_to_id[mn_name] = pid
        return None
    # check if already added this pass
    if rom_name in name_to_id:
        return None
    pid = f"person-{person_counter:03d}"
    person_counter += 1
    
    party_label = {
        "MPP": "МАН",
        "DP": "АН",
        "HUN": "ХҮН Нам",
        "NC": "Үндэсний Эвсэл",
        "CWGP": "ИЗНН",
        "IND": "Бие даагч",
        "RPEC": "Шударга хүн бүлэг",
        "OUR": "Манай Эвсэл",
    }.get(party, party)
    
    born_str = f"{born} онд төрсөн. " if born else ""
    entity = {
        "id": pid,
        "name": mn_name,
        "type": "person",
        "description": f"{born_str}{party_label}-ын гишүүн. {constituency} тойргоос УИХ-д сонгогдсон. {notes}".strip(),
        "aliases": [rom_name],
        "tags": [party.lower(), "parliament", "УИХ"],
        "importance": importance,
        "confidence": 95,
        "sourceIds": ["source-014", "source-015"],
        "createdAt": "2026-06-18T00:00:00Z",
        "updatedAt": "2026-06-18T00:00:00Z"
    }
    new_entities.append(entity)
    name_to_id[rom_name] = pid
    name_to_id[mn_name] = pid
    return pid

# Add 2020 parliament members
member_ids_2020 = {}
for item in MEMBERS_2020:
    if len(item) == 6:
        rom, mn, party, born, const, imp = item
        notes = ""
    else:
        rom, mn, party, born, const, imp, notes = item
    pid = add_member(rom, mn, party, born, const, imp, notes)
    actual_id = pid or SKIP_2020.get(rom)
    if actual_id:
        member_ids_2020[rom] = actual_id

# Add 2024-only notable members
member_ids_2024_new = {}
for item in MEMBERS_2024_NEW:
    rom, mn, party, born, const, imp, notes = item
    # Check Battulga not already in dataset
    pid = add_member(rom, mn, party, born, const, imp, notes)
    if pid:
        member_ids_2024_new[rom] = pid

# Add new party orgs (org-004 and org-005 only; org-003 is already HUN)
for_entities_orgs = []
for org in [NEW_ORGS[0], NEW_ORGS[1]]:  # NC and CWGP only
    if org["id"] not in existing_ids:
        for_entities_orgs.append(org)

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: Build new relationships
# ──────────────────────────────────────────────────────────────────────────────
new_relationships = []
rel_counter = next_rel_id()

PARTY_ORG = {
    "MPP": "org-001",
    "DP": "org-002",
    "HUN": "org-003",
    "NC": "org-004",
    "CWGP": "org-005",
}

# Parliament terms
PARL_2020 = ("2020-07-01", "2024-07-02")
PARL_2024 = ("2024-07-02", "")

def add_rel(src, tgt, rtype, desc, start, end, strength, conf, src_ids, ev_ids=None):
    global rel_counter
    rid = f"rel-{rel_counter:03d}"
    rel_counter += 1
    rel = {
        "id": rid,
        "sourceEntityId": src,
        "targetEntityId": tgt,
        "relationshipType": rtype,
        "description": desc,
        "strength": strength,
        "confidence": conf,
        "status": "confirmed",
        "evidenceIds": ev_ids or [],
        "sourceIds": src_ids,
        "startDate": start,
        "endDate": end,
        "createdAt": "2026-06-18T00:00:00Z",
        "updatedAt": "2026-06-18T00:00:00Z"
    }
    new_relationships.append(rel)
    return rid

# Generate parliament membership + party relationships for 2020 members
for item in MEMBERS_2020:
    if len(item) == 6:
        rom, mn, party, born, const, imp = item
    else:
        rom, mn, party, born, const, imp, _ = item
    
    pid = name_to_id.get(rom)
    if not pid:
        continue
    
    # Parliament employment (2020-2024)
    add_rel(pid, "agency-003", "employment",
            f"{mn} 2020 оны сонгуулиар {const} тойргоос УИХ-д сонгогдсон (2020–2024).",
            PARL_2020[0], PARL_2020[1], 90, 95,
            ["source-014", "source-015"])
    
    # Party membership
    org_id = PARTY_ORG.get(party)
    if org_id:
        party_labels = {"MPP": "МАН", "DP": "АН", "HUN": "ХҮН Нам"}
        party_label = party_labels.get(party, party)
        add_rel(pid, org_id, "party_member",
                f"{mn} {party_label}-ын гишүүн.",
                "", "", 85, 95,
                ["source-014"])

# Add parliament membership for known 2020 MPs that are in existing entities
# (they weren't in MEMBERS_2020 list since we skip them)
EXISTING_2020_MEMBERS = {
    "person-001": ("Ухнаагийн Хүрэлсүх", "MPP", "Хэнтий", "2020-07-01", "2021-06-25"),
    "person-003": ("Лувсаннамсрайн Оюун-Эрдэнэ", "MPP", "Хэнтий", "2020-07-01", "2024-07-02"),
    "person-006": ("Няморсрын Учрал", "MPP", "УБ Сонгинохайрхан", "2020-07-01", "2024-07-02"),
    "person-008": ("Жадамбын Энхбаяр", "MPP", "Булган", "2020-07-01", "2024-07-02"),
    "person-009": ("Гонгорын Дамдинням", "MPP", "Дархан-Уул", "2020-07-01", "2024-07-02"),
    "person-010": ("Сандагийн Бямбацогт", "MPP", "Ховд", "2020-07-01", "2024-07-02"),
    "person-011": ("Жаргалтулгын Эрдэнэбат", "MPP", "Сэлэнгэ", "2020-07-01", "2024-07-02"),
    "person-012": ("Гомбожавын Занданшатар", "MPP", "Баянхонгор", "2020-07-01", "2024-07-02"),
}

for pid, (mn, party, const, start, end) in EXISTING_2020_MEMBERS.items():
    add_rel(pid, "agency-003", "employment",
            f"{mn} {const} тойргоос УИХ-д сонгогдсон.",
            start, end, 90, 100, ["source-014", "source-015"])

# 2024 parliament — re-elected members (those in both 2020 and 2024)
REELECTED_2024 = [
    # (romanized_name, constituency_2024, party)
    ("Lkhagvyn Mönkhbaatar", "Булган/Хөвсгөл/Орхон (4-р)", "MPP"),
    ("Jadambyn Bat-Erdene", "Булган/Хөвсгөл/Орхон (4-р)", "MPP"),
    ("Tserenpiliin Davaasüren", "Булган/Хөвсгөл/Орхон (4-р)", "MPP"),
    ("Dambyn Batlut", "Булган/Хөвсгөл/Орхон (4-р)", "MPP"),
    ("Luvsantserengiin Enkh-Amgalan", "Булган/Хөвсгөл/Орхон (4-р)", "MPP"),
    ("Boldyn Javkhlan", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "MPP"),
    ("Tsevegdorjiin Tuvaan", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "DP"),
    ("Jigjidiin Batjargal", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "MPP"),
    ("Gongoryn Damdinnyam", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "MPP"),  # person-009
    ("Chinbatyn Undram", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "MPP"),
    ("Ganzorigiin Temüülen", "Архангай/Баянхонгор/Өвөрхангай (1-р)", "MPP"),
    ("Dashdondogiin Ganbat", "Архангай/Баянхонгор/Өвөрхангай (1-р)", "DP"),
    ("Sandagiin Byambatsogt", "Говь-Алтай/Ховд/Увс/Завхан (2-р)", "MPP"),  # person-010
    ("Odongiin Tsogtgerel", "Говь-Алтай/Ховд/Увс/Завхан (2-р)", "DP"),
    ("Bökhchuluuny Pürevdorj", "Говь-Алтай/Ховд/Увс/Завхан (2-р)", "DP"),
    ("Battogtokhyn Choijilsüren", "Говь-Алтай/Ховд/Увс/Завхан (2-р)", "MPP"),
    ("Tyelukhany Aubakar", "Баян-Өлгий (3-р)", "MPP"),
    ("Bulany Byeisyen", "Баян-Өлгий (3-р)", "DP"),
    ("Luvsannamsrain Oyun-Erdene", "Дорнод/Хэнтий/Сүхбаатар (6-р)", "MPP"),  # person-003
    ("Tsagaankhüügiin Iderbat", "Дорнод/Хэнтий/Сүхбаатар (6-р)", "MPP"),
    ("Borkhüügiin Delgersaikhan", "Дорноговь/Дундговь/Өмнөговь (7-р)", "MPP"),
    ("Nanzadyn Naranbaatar", "Дорноговь/Дундговь/Өмнөговь (7-р)", "MPP"),
    ("Jigjidsürengiin Chinbüren", "УБ Баянзүрх (8-р)", "MPP"),
    ("Battömöriin Enkhbayar", "УБ Баянзүрх (8-р)", "MPP"),
    ("Enkhtaivany Bat-Amgalan", "УБ Баянзүрх (8-р)", "MPP"),
    ("Khürelbaataryn Bulgantuya", "УБ Баянзүрх (8-р)", "MPP"),
    ("Khassuuriin Gankhuyag", "УБ Баянгол (9-р)", "MPP"),
    ("Jambalyn Ganbaatar", "УБ Баянгол (9-р)", "MPP"),
    ("Nyam-Osoryn Uchral", "УБ Чингэлтэй/Сүхбаатар (10-р)", "MPP"),  # person-006
    ("Damdiny Tsogtbaatar", "УБ Чингэлтэй/Сүхбаатар (10-р)", "MPP"),
    ("Enkhbayaryn Batshugar", "УБ Сонгинохайрхан (11-р)", "MPP"),
    ("Norovyn Altankhuyag", "УБ Сонгинохайрхан (11-р)", "DP"),
    ("Sainbuyangiin Amarsaikhan", "УБ Багахангай/Багануур/Налайх (13-р)", "MPP"),
    ("Tsendiin Sandag-Ochir", "УБ Багахангай/Багануур/Налайх (13-р)", "MPP"),
    ("Jambyn Batsuuri", "ДН нийтийн жагсаалт (3-р)", "DP"),
    ("Saldangiin Odontuyaa", "ДН нийтийн жагсаалт (2-р)", "DP"),
    ("Togmidyn Dorjkhand", "ХҮН нийтийн жагсаалт (1-р)", "HUN"),
    ("Jadambyn Enkhbayar", "Дархан-Уул/Сэлэнгэ/Төв (5-р)", "MPP"),  # person-008
]

for rom, const, party in REELECTED_2024:
    pid = name_to_id.get(rom)
    if not pid:
        pid = SKIP_2020.get(rom)
    if not pid:
        continue
    add_rel(pid, "agency-003", "employment",
            f"2024 оны сонгуулиар {const} тойрогт дахин сонгогдсон.",
            PARL_2024[0], PARL_2024[1], 90, 95,
            ["source-016"])

# 2024-only new members
for rom, mn, party, born, const, imp, notes in MEMBERS_2024_NEW:
    pid = name_to_id.get(rom)
    if not pid:
        continue
    add_rel(pid, "agency-003", "employment",
            f"{mn} 2024 оны сонгуулиар {const} тойрогт сонгогдсон.",
            PARL_2024[0], PARL_2024[1], 90, 95,
            ["source-016"])
    org_id = PARTY_ORG.get(party)
    if org_id:
        add_rel(pid, org_id, "party_member",
                f"{mn} {party}-ын гишүүн.",
                "", "", 85, 95, ["source-016"])

# Special relationship: Battulga was President (2017-2021)
battulga_id = name_to_id.get("Khaltmaagiin Battulga")
if battulga_id:
    add_rel(battulga_id, "agency-001", "employment",
            "Халтмаагийн Батулга 2017 оны 7 дугаар сарын 10-аас 2021 оны 6 дугаар сарын 25 хүртэл Монгол Улсын 5 дахь Ерөнхийлөгч.",
            "2017-07-10", "2021-06-25", 95, 100, ["source-014"])
    # Battulga and Khurelsukh — predecessor/successor relationship
    add_rel(battulga_id, "person-001", "political_ally",
            "Батулга болон Хүрэлсүх хоёр ерөнхийлөгчийн хувьд улс төрийн өрсөлдөгчид. Батулга ДН-аас, Хүрэлсүх МАН-аас.",
            "", "", 40, 90, ["source-014"])

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5: Add new sources for parliament data
# ──────────────────────────────────────────────────────────────────────────────
new_sources = [
    {
        "id": "source-014",
        "title": "List of members of the State Great Khural, 2020–2024 — Wikipedia",
        "publisher": "Wikipedia",
        "url": "https://en.wikipedia.org/wiki/List_of_members_of_the_State_Great_Khural,_2020%E2%80%932024",
        "archiveUrl": "",
        "publishedAt": "2020-07-01",
        "retrievedAt": "2026-06-18",
        "reliabilityNotes": "2020-2024 оны УИХ-ын бүрэн гишүүдийн жагсаалт. Wikipedia – дунд-өндөр найдвартай.",
        "tags": ["parliament", "2020", "election"]
    },
    {
        "id": "source-015",
        "title": "2020 Mongolian parliamentary election — Wikipedia",
        "publisher": "Wikipedia",
        "url": "https://en.wikipedia.org/wiki/2020_Mongolian_parliamentary_election",
        "archiveUrl": "",
        "publishedAt": "2020-06-24",
        "retrievedAt": "2026-06-18",
        "reliabilityNotes": "2020 оны УИХ-ын сонгуулийн дүн. Wikipedia – өндөр найдвартай.",
        "tags": ["parliament", "election", "2020"]
    },
    {
        "id": "source-016",
        "title": "List of members of the State Great Khural, 2024–2028 — Wikipedia",
        "publisher": "Wikipedia",
        "url": "https://en.wikipedia.org/wiki/List_of_members_of_the_State_Great_Khural,_2024%E2%80%932028",
        "archiveUrl": "",
        "publishedAt": "2024-07-02",
        "retrievedAt": "2026-06-18",
        "reliabilityNotes": "2024-2028 оны УИХ-ын бүрэн гишүүдийн жагсаалт. Wikipedia – дунд-өндөр найдвартай.",
        "tags": ["parliament", "2024", "election"]
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# STEP 6: Changelog entries
# ──────────────────────────────────────────────────────────────────────────────
cl_counter = next_cl_id()
new_changelog = []

for ne in new_entities:
    cid = f"cl-{cl_counter:03d}"
    cl_counter += 1
    new_changelog.append({
        "id": cid,
        "date": "2026-06-18",
        "type": "entity_added",
        "entityId": ne["id"],
        "description": f"{ne['name']} (УИХ-ын гишүүн) нэмэгдлээ",
        "addedBy": "parliament-import"
    })

# ──────────────────────────────────────────────────────────────────────────────
# STEP 7: Write all files
# ──────────────────────────────────────────────────────────────────────────────
all_entities = entities + new_entities + for_entities_orgs
all_relationships = relationships + new_relationships
all_sources = sources + new_sources
all_changelog = changelog + new_changelog

with open(DATA_DIR / "entities.json", "w", encoding="utf-8") as f:
    json.dump(all_entities, f, ensure_ascii=False, indent=2)
with open(DATA_DIR / "relationships.json", "w", encoding="utf-8") as f:
    json.dump(all_relationships, f, ensure_ascii=False, indent=2)
with open(DATA_DIR / "sources.json", "w", encoding="utf-8") as f:
    json.dump(all_sources, f, ensure_ascii=False, indent=2)
with open(DATA_DIR / "changelog.json", "w", encoding="utf-8") as f:
    json.dump(all_changelog, f, ensure_ascii=False, indent=2)

print(f"✅ Entities: {len(entities)} → {len(all_entities)} (+{len(new_entities) + len(for_entities_orgs)})")
print(f"✅ Relationships: {len(relationships)} → {len(all_relationships)} (+{len(new_relationships)})")
print(f"✅ Sources: {len(sources)} → {len(all_sources)} (+{len(new_sources)})")
print(f"✅ Changelog: {len(changelog)} → {len(all_changelog)} (+{len(new_changelog)})")
print(f"✅ Evidence: {len(evidence)} (unchanged)")
print(f"✅ Investigations: 2 (unchanged)")
