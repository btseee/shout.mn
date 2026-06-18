import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { usePageMeta } from '@/utils/seo.ts'

export function DataMethodologyPage() {
  usePageMeta({ title: 'Data Methodology', description: 'How shout.mn collects, validates, and presents data.' })

  return (
    <PageLayout maxWidth="2xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Data Methodology</h1>

      <div className="space-y-8 text-slate-600 dark:text-slate-300">
        <Section title="Data structure">
          <p>shout.mn organizes information into six types of records: <strong>entities</strong> (people, companies, organizations, government agencies, projects, contracts, donations, and media outlets); <strong>relationships</strong> between entities; <strong>sources</strong> that provide evidence; <strong>evidence</strong> linking sources to specific claims; <strong>investigations</strong> that provide narrative context; and a <strong>changelog</strong> tracking updates.</p>
        </Section>

        <Section title="How entities are added">
          <p>An entity is added when it is directly relevant to a documented relationship. We document what is public record. We do not speculate about undocumented entities.</p>
        </Section>

        <Section title="How relationships are established">
          <p>A relationship must have at least one supporting evidence item, which must link to a verifiable source. The relationship is then assigned a status (confirmed, probable, inferred, or disputed) based on the quality and quantity of evidence. Confidence scores (0–100) and strength scores (0–100) are assigned editorially.</p>
        </Section>

        <Section title="Source reliability">
          <p>Sources are evaluated on the following factors: official vs. secondary; primary document vs. journalism; single source vs. corroborated. Each source includes reliability notes explaining how it was assessed.</p>
        </Section>

        <Section title="How to contribute or report errors">
          <p>This is a demonstration platform with fictional data. For production deployments, editors update data by modifying the JSON files in <code className="text-sm bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">public/data/</code> following the documented schemas, then running <code className="text-sm bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">npm run validate:data</code> to verify integrity.</p>
        </Section>

        <Section title="Validation">
          <p>All data is validated automatically before publication. The validation script checks: unique IDs, referential integrity (all referenced IDs exist), valid date formats, confidence and strength values in range, and valid status values.</p>
        </Section>
      </div>
    </PageLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
