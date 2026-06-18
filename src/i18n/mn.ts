/**
 * Mongolian UI translations.
 * i18n-ready: add new language files (e.g. en.ts) and switch via index.ts.
 */
export const t = {
  nav: {
    graph: 'Граф',
    search: 'Хайлт',
    updates: 'Шинэчлэлт',
    toDark: 'Харанхуй горим руу шилжих',
    toLight: 'Цайвар горим руу шилжих',
    openMenu: 'Цэс нээх',
    closeMenu: 'Цэс хаах',
    skipContent: 'Агуулга руу үсрэх',
  },

  footer: {
    sourceCode: 'Эх код',
    copyright: `© ${new Date().getFullYear()} shout.mn`,
  },

  graph: {
    tabGraph: 'Граф',
    tabPath: 'Зам олагч',
    statsEntities: (n: number) => `${n} субьект`,
    statsRels: (n: number) => `${n} харилцаа`,
    tip: 'Зангилааг товшиж холбоосуудыг судлах',
    zoomIn: 'Томруулах',
    zoomOut: 'Жижгэрүүлэх',
    reset: 'Харагдах байдалыг сэргээх',
    toggleFilters: 'Шүүлтүүрийг асаах/унтраах',
    toggleLegend: 'Тайлбарыг харуулах/нуух',
    ariaLabel:
      'Харилцааны граф. Зангилаа сонгосны дараа гарын товчлуур ашиглан гаръдах боломжтой.',
  },

  legend: {
    entities: 'Субьектүүд',
    relationships: 'Харилцаанууд',
    nodeSize: 'Зангилааны хэмжээ = ач холбогдол',
  },

  panel: {
    alsoKnownAs: 'Мөн нэрлэгддэг:',
    connections: (n: number) => `${n} холбоос`,
    more: (n: number) => `+${n} дахь`,
    period: 'Хугацаа',
    close: 'Хаах',
  },

  pathfinder: {
    title: 'Холбоосын зам олагч',
    description:
      'Аливаа хоёр субьектийн хоорондох хамгийн богино баримтат замыг олоорой. Алхам бүр нь харилцааны төрөл болон нотолгоог харуулна.',
    from: 'Субьектээс',
    to: 'Субьект рүү',
    selectEntity: 'Субьект сонгох...',
    find: 'Холбоос олох',
    clear: 'Арилгах',
    noConnectionTitle: 'Холбоос олдсонгүй',
    noConnectionDesc:
      'Эдгээр субьектийн хоорондох баримтат зам одоогийн өгөгдөлд байхгүй байна.',
    pathResult: (e: number, s: number) => `Зам: ${e} субьект, ${s} алхам`,
  },

  search: {
    title: 'Хайлт',
    placeholder: 'Субьект, харилцаа, эх сурвалж хайх...',
    clearLabel: 'Хайлт цэвэрлэх',
    noResults: (q: string) => `"${q}"-д үр дүн олдсонгүй`,
    startTyping: 'Хайлт хийхийн тулд бичиж эхлэх',
    tryDifferent: 'Өөр түлхүүр үг оролдох эсвэл графыг харах',
    all: (n: number) => `Бүгд (${n})`,
    entities: (n: number) => `Субьектүүд (${n})`,
    relationships: (n: number) => `Харилцаанууд (${n})`,
    sources: (n: number) => `Эх сурвалжууд (${n})`,
    seeAll: (n: number, q: string) => `"${q}"-ийн ${n} үр дүнг харах`,
    entityKind: 'Субьект',
    relKind: 'Харилцаа',
    sourceKind: 'Эх сурвалж',
    dropdownSection: 'Субьектүүд',
    noDropdown: (q: string) => `"${q}"-д үр дүн олдсонгүй`,
  },

  changes: {
    title: 'Сүүлийн шинэчлэлтүүд',
    types: {
      entity_added: 'Субьект нэмэгдсэн',
      entity_updated: 'Субьект шинэчлэгдсэн',
      relationship_added: 'Харилцаа нэмэгдсэн',
      relationship_updated: 'Харилцаа шинэчлэгдсэн',
      source_added: 'Эх сурвалж нэмэгдсэн',
      evidence_added: 'Нотолгоо нэмэгдсэн',
      evidence_updated: 'Нотолгоо шинэчлэгдсэн',
      investigation_added: 'Мөрдлөг нийтлэгдсэн',
    } as Record<string, string>,
  },

  common: {
    loading: 'Ачаалж байна...',
    errorTitle: 'Алдаа гарлаа',
    errorDesc: 'Өгөгдөл ачаалахад амжилтгүй болсон. Дахин оролдоно уу.',
    share: 'Хуваалцах',
    copied: 'Хуулагдлаа',
    copyLinkLabel: 'Холбоосыг хуулах',
    closePanel: 'Хаах',
  },
}

export type Translations = typeof t
