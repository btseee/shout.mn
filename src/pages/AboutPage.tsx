import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { usePageMeta } from '@/utils/seo.ts'

export function AboutPage() {
  usePageMeta({ title: 'shout.mn-ийн тухай', description: 'shout.mn мөрдлөгийн харилцааны тагнуулын платформын тухай.' })

  return (
    <PageLayout maxWidth="2xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">shout.mn-ийн тухай</h1>
      <div className="prose-like space-y-6 text-slate-600 dark:text-slate-300">
        <Section title="shout.mn гэж юу вэ?">
          <p>shout.mn нь улс төрчид, компаниуд, засгийн газрын байгуулага болон нийтийн ашиг сонирхолын байгууллагуудын хоорондох баримтат харилцаануудыг дүрслэн харуулдаг нийтийн ашиг сонирхолын платформ болоно.</p>
          <p>Манай зорилго нь нотолгоогоор дамжуулсан ил тод байдал. Энэ платформ дээрх харилцаа нь баримтлагдсан бөгөөд эх сурвалжтай. Хэрэглэгчид өөрийн дүгнэлтийг гаргана.</p>
        </Section>
        <Section title="shout.mn гэж юу биш вэ">
          <p>Энэ платформ нь хэн нэгэнийг буруу зүйл хийгээ учир агуулдаггүй. Харилцааны оршин буй ч, гэр бүлийн холбоо, танхимийн зөвлөлийн гишүүнчлэл ба худалдан авалтын гэрээ нь баримтагдсан баримтууд бөгөөд хэлхэн бурутгаллалга биш.</p>
        </Section>
        <Section title="Харилцаанууд хэрхэн тодорхойлдог вэ?">
          <p>Хар харилцаа нь дорх талда нэг нэг нотолгоог шаардах шаардлагдай. Эх сурвалж нь албан төрийн бичиг, хуулийн материал эсвэл хэдэл бие итгэмжтүй эх сурвалжуудыг агуулдаг. Харилцааг <strong>баталгаажсан</strong>, <strong>магадлалтай</strong>, <strong>дүгнэсэн</strong>, есвэл <strong>маргаантай</strong> гэж оноох утгаар шинжлэдсэн.</p>
        </Section>
        <Section title="Жишиг өгөгдөлийн мэдээгдэл">
          <p>Энэ жишиг өгөгдөл нь платформын чадварыг улам харуулахын тулд зориулгаар зориулдсан зохиомол 中дааг өгөгдөл ашигладаг. Багш бүлэг орчмын талбар дсан иргэхдээр зориулдсон одоо орчмын өгөгдөл ашигладаг. Бхүйцээр албан биш байдалд үлдэх учир заналгаа ахуй амар реалтай хэрэглэгчийн гараар ахуй амар пөгч заавар ашигладаг.</p>
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
