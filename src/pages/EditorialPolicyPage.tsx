import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { usePageMeta } from '@/utils/seo.ts'
import { Shield } from 'lucide-react'

export function EditorialPolicyPage() {
  usePageMeta({ title: 'Редакцийн бодлого', description: 'shout.mn-ийн редакцийн стандарт ба бодлого.' })

  return (
    <PageLayout maxWidth="2xl">
      <div className="flex items-center gap-2 mb-8">
        <Shield size={20} className="text-rose-600" />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Редакцийн бодлого</h1>
      </div>

      <div className="space-y-8 text-slate-600 dark:text-slate-300">
        <PolicySection title="Mandatory rules">
          <PolicyList items={[
            'Every relationship must have at least one piece of supporting evidence.',
            'Every relationship must have source attribution linking to a verifiable record.',
            'Inferences must be labeled as "inferred" — never presented as confirmed facts.',
            'Disputed claims must carry the "disputed" label with explanation.',
            'We never imply wrongdoing from proximity alone.',
            'We never imply wrongdoing from ownership or board membership alone.',
            'We never imply wrongdoing from family connections.',
          ]} />
        </PolicySection>

        <PolicySection title="Status definitions">
          <div className="space-y-4">
            <StatusDef status="Confirmed" color="emerald" description="The relationship is documented in official records, legal filings, regulatory disclosures, or multiple independent credible sources. The evidence is direct and unambiguous." />
            <StatusDef status="Probable" color="blue" description="The relationship is supported by credible evidence but has not been confirmed in official records or independently verified by multiple sources. A reasonable person would consider this relationship likely." />
            <StatusDef status="Inferred" color="amber" description="The relationship is not directly evidenced but is logically derived from other confirmed relationships. Inferred relationships are explicitly labeled and explained. They represent analytical conclusions, not established facts." />
            <StatusDef status="Disputed" color="slate" description="One or more parties contest the existence or nature of this relationship. Disputed relationships are documented along with both the claim and the counter-claim." />
          </div>
        </PolicySection>

        <PolicySection title="Language standards">
          <PolicyList items={[
            'We describe, we do not characterize. "Company X received Contract Y" is preferable to "Company X won Contract Y."',
            'We document connections. We do not draw legal conclusions.',
            'We use neutral language throughout. No words that imply guilt, criminality, or wrongdoing unless directly quoting a legal finding.',
            'We distinguish between fact, evidence, inference, and interpretation.',
          ]} />
        </PolicySection>

        <PolicySection title="What we publish and why">
          <p className="leading-relaxed">We publish documented relationships in the public interest when: they involve public officials exercising public duties; they involve public funds; they involve entities subject to public oversight; or they are relevant to understanding how public decisions are made.</p>
        </PolicySection>
      </div>
    </PageLayout>
  )
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      {children}
    </div>
  )
}

function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" />
          <span className="text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function StatusDef({ status, color, description }: { status: string; color: string; description: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    slate: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
  }
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <p className="font-semibold text-slate-900 dark:text-white mb-1">{status}</p>
      <p className="text-sm leading-relaxed">{description}</p>
    </div>
  )
}
