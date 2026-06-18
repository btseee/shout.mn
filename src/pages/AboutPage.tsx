import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { usePageMeta } from '@/utils/seo.ts'

export function AboutPage() {
  usePageMeta({ title: 'About shout.mn', description: 'About the shout.mn investigative relationship intelligence platform.' })

  return (
    <PageLayout maxWidth="2xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">About shout.mn</h1>
      <div className="prose-like space-y-6 text-slate-600 dark:text-slate-300">
        <Section title="What is shout.mn?">
          <p>shout.mn is a public-interest platform that visualizes documented relationships between politicians, companies, government agencies, procurement contracts, and other public-interest entities.</p>
          <p>Our goal is transparency through evidence. Every relationship on this platform is documented, sourced, and labeled with its confidence level and status.</p>
        </Section>
        <Section title="What shout.mn is not">
          <p>shout.mn does not accuse anyone of wrongdoing. The existence of a relationship — whether family, professional, financial, or organizational — is not evidence of corruption or misconduct.</p>
          <p>This platform presents facts. Users draw their own conclusions.</p>
        </Section>
        <Section title="How relationships are determined">
          <p>Every relationship requires at least one supporting piece of evidence from a verifiable source. Sources include official government records, regulatory filings, court documents, and credible journalism.</p>
          <p>Relationships are classified as <strong>confirmed</strong>, <strong>probable</strong>, <strong>inferred</strong>, or <strong>disputed</strong>. These labels are applied according to our editorial policy.</p>
        </Section>
        <Section title="Sample data notice">
          <p>This instance of shout.mn uses entirely fictional sample data to demonstrate the platform's capabilities. All entities, relationships, and investigations in this dataset are fictitious. Any resemblance to real persons or organizations is coincidental.</p>
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
