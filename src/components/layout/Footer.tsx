import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="font-bold text-xl mb-2">
              <span className="text-slate-900 dark:text-white">shout</span>
              <span className="text-rose-600 dark:text-rose-400">.mn</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Нийтийн ашиг сонирхолын байгууллагуудын хоорондох баримтат харилцаанууд. Нотолгоогоор дамжуулсан ил тод байдал.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Платформ</h3>
            <ul className="space-y-2">
              <li><FooterLink to="/graph">Граф судлагч</FooterLink></li>
              <li><FooterLink to="/search">Хайлт</FooterLink></li>
              <li><FooterLink to="/changes">Сүүлийн шинэчлэлтүүд</FooterLink></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Тухай</h3>
            <ul className="space-y-2">
              <li><FooterLink to="/about">shout.mn-ийн тухай</FooterLink></li>
              <li><FooterLink to="/editorial-policy">Редакцийн бодлого</FooterLink></li>
              <li><FooterLink to="/data-methodology">Өгөгдөлийн арга зүй</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Бүх харилцаа нь баримтлагдсан бөгөөд эх сурвалжтай. Энэ платформ дээрх ямар ч мэдээлэл буруу зүйл хийгээ учир агуулдаггүй. Хэрэглэгчид нотолгооноос өөрийн дүгнэлтийг гаргана.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
            Бүх жишиг өгөгдөл нь зохиомол
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      {children}
    </Link>
  )
}
