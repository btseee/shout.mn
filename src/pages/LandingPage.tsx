import { Link } from '@tanstack/react-router'
import { Network, Search, ArrowRight, Shield, FileText, Clock } from 'lucide-react'
import { useEntities, useRelationships, useSources, useInvestigations, useChangelog } from '@/data/hooks.ts'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { EntityTypeBadge } from '@/components/common/Badge.tsx'
import { SearchBar } from '@/components/search/SearchBar.tsx'
import { usePageMeta } from '@/utils/seo.ts'
import { formatDateShort } from '@/utils/format.ts'

export function LandingPage() {
  usePageMeta({
    title: 'Investigative Relationship Intelligence',
    description: 'Documented relationships between politicians, companies, and public-interest entities. Transparency through evidence.',
  })

  const { data: entities, isLoading: entLoading } = useEntities()
  const { data: relationships, isLoading: relLoading } = useRelationships()
  const { data: sources } = useSources()
  const { data: investigations } = useInvestigations()
  const { data: changelog } = useChangelog()

  if (entLoading || relLoading) return <PageLoader />

  const recentEntities = [...(entities ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  const featuredInvestigations = (investigations ?? []).slice(0, 3)
  const recentChanges = [...(changelog ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-rose-600/20 text-rose-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-rose-600/30">
            <Shield size={14} />
            Нийтийн ашиг сонирхолын сэтгүүл зүй
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Баримтат харилцаанууд.{' '}
            <span className="text-rose-400">Ил тод нотолгоо.</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            shout.mn нь улс төрчид, компаниуд, засгийн газрын байгуулага, худалдан авалтын гэрээ болон нийтийн ашиг сонирхолын байгууллагуудын хоорондох баримтат холбоосуудыг дүрслэн харуулдаг. Бүх харилцаа эх сурвалжтай. Бүх мэдэгдэл баримтлагдсан.
          </p>
          <div className="max-w-xl mx-auto mb-8">
            <SearchBar placeholder="Субьект, харилцаа, эх сурвалж хайх..." />
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/graph"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Network size={18} />
              Граф судлах
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/20"
            >
              <Search size={18} />
              Субьектүүд хайх
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <Stat value={entities?.length ?? 0} label="Субьектүүд" />
            <Stat value={relationships?.length ?? 0} label="Харилцаанууд" />
            <Stat value={sources?.length ?? 0} label="Эх сурвалжууд" />
          </div>
        </div>
      </section>

      {/* What this is not */}
      <section className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-3">
            <Shield size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                shout.mn гэж юу биш вэ
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Энэ платформ нь хэн нэгэнийг буруу зүйл хийгээ учир агуулдаггүй. Ойрчны байдал, гэр бүлийн холбоо, танхимийн зөвлөлийн гишүүнчлэл болон худалдан авалтын гэрээ нь баримтагдсан баримтууд бөгөөд хэлхэн бурутгаллалга биш. Хэрэглэгчид нотолгооноос өөрийн дүгнэлтийг гаргана. Бүх харилцаа нь <strong>баталгаажсан</strong>,{' '}
                <strong>магадлалтай</strong>, <strong>дүгнэсэн</strong>, эсвэл <strong>маргаантай</strong> гэж шошиглогдсон.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Investigations */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-rose-600" />
                Онцлох мөрдлөгүүд
              </h2>
              <Link to="/search" className="text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                Бүгд <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-4">
              {featuredInvestigations.map((inv) => (
                <Link
                  key={inv.id}
                  to="/investigation/$id"
                  params={{ id: inv.id }}
                  className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 bg-white dark:bg-slate-900 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{inv.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{inv.summary}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {inv.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar: Recent updates + entities */}
          <div className="space-y-8">
            {/* Recent Changes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-rose-600" />
                  Сүүлийн шинэчлэлтүүд
                </h2>
                <Link to="/changes" className="text-sm text-rose-600 dark:text-rose-400 hover:underline">
                  Бүгд
                </Link>
              </div>
              <div className="space-y-2">
                {recentChanges.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 text-sm">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs">{entry.description}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs">{formatDateShort(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Entities */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Сүүлд нэмэгдсэн
              </h2>
              <div className="space-y-2">
                {recentEntities.map((entity) => (
                  <Link
                    key={entity.id}
                    to="/entity/$id"
                    params={{ id: entity.id }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {entity.name}
                    </span>
                    <EntityTypeBadge type={entity.type} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Relationship status explanation */}
        <div className="mt-12 p-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Харилцааны статусыг ойлгох
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusExplainer
              status="confirmed"
              label="Баталгаажсан"
              description="Албан баримт, хуулийн материал эсвэл хэдэл бие хамаарал тусгаал эх сурвалжт баримтлагдсан."
            />
            <StatusExplainer
              status="probable"
              label="Магадлалтай"
              description="Итгэмтгүй нотолгоогоор дэмжлэгдсэн боловч албан баримтаар баталгаажаагүй байна."
            />
            <StatusExplainer
              status="inferred"
              label="Дүгнэсэн"
              description="Бусад баталгаажсан харилцаануудаас логикийн даагал гарган. Илэрхүйцээр дүгнэлт гэж шошиглогдсон."
            />
            <StatusExplainer
              status="disputed"
              label="Маргаантай"
              description="Нэг ц түүнээс талууд харилцааны оршин буй ч мөн чанарыг эсэргүйцэж байна."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function StatusExplainer({ status, label, description }: { status: string; label: string; description: string }) {
  const colors: Record<string, string> = {
    confirmed: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30',
    probable: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30',
    inferred: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30',
    disputed: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700',
  }
  return (
    <div className={`p-3 rounded-lg ${colors[status]}`}>
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  )
}

