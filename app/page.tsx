import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/OpenShop-Logo-Dark-NoBG.png"
            alt="OpenShop"
            width={200}
            height={52}
            priority
            className="h-20 w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Now live in Jersey City, NJ
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
          Open your business
          <br />
          <span className="text-blue-600">without the runaround.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          OpenShop guides you through every permit, license, and zoning requirement
          to open your business — with AI that actually knows your city&apos;s rules.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-8 py-3.5 text-base font-semibold hover:bg-blue-700 transition-colors"
          >
            Start for free →
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-200 px-8 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            How it works
          </h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
            From idea to open doors — we handle the complexity so you can focus on your business.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Tell us about your business',
                description:
                  'Answer a few questions about your business type, location, and goals. Takes under 3 minutes.',
              },
              {
                step: '02',
                title: 'Get your custom roadmap',
                description:
                  'We generate a step-by-step workflow of every permit, license, and inspection you need — specific to your city.',
              },
              {
                step: '03',
                title: 'Track your progress',
                description:
                  'Check off tasks, upload documents, and ask our AI assistant any question about local regulations — anytime.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-xl border border-slate-200/80 p-7 shadow-sm"
              >
                <div className="text-xs font-mono font-semibold text-blue-500 mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Built for the reality of opening a small business
            </h2>
            <ul className="space-y-5">
              {[
                {
                  title: 'City-specific, not generic',
                  body: "Our AI is trained on your municipality's actual zoning codes, permit applications, and health department requirements — not a generic national template.",
                },
                {
                  title: 'Nothing falls through the cracks',
                  body: "Every step is connected. Dependencies are tracked automatically — you'll never start a permit before you're legally allowed to.",
                },
                {
                  title: "Always know what's next",
                  body: 'A clear visual workflow shows exactly where you are, what\'s blocked, and what you can work on in parallel.',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                    <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Task card preview */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            {[
              { label: 'Register your LLC', status: 'completed', cat: 'Registration' },
              { label: 'Obtain EIN from IRS', status: 'completed', cat: 'Registration' },
              { label: 'Certificate of Occupancy', status: 'in_progress', cat: 'Permit' },
              { label: 'Health Department Inspection', status: 'locked', cat: 'Inspection' },
              { label: 'Liquor License Application', status: 'locked', cat: 'License' },
            ].map((task) => (
              <div
                key={task.label}
                className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 text-sm shadow-sm ${
                  task.status === 'completed'
                    ? 'border-emerald-500/80'
                    : task.status === 'in_progress'
                    ? 'border-blue-500/80'
                    : 'border-dashed border-slate-300 opacity-60'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex-shrink-0 ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : task.status === 'in_progress'
                      ? 'bg-blue-500 ring-4 ring-blue-100'
                      : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`flex-1 font-medium ${
                    task.status === 'locked' ? 'text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {task.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">{task.cat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to open your business?
          </h2>
          <p className="text-slate-400 mb-8">
            Get your personalized permit roadmap in minutes. Free to start.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-8 py-3.5 text-base font-semibold hover:bg-blue-500 transition-colors"
          >
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image
            src="/OpenShop-Logo-Dark-NoBG.png"
            alt="OpenShop"
            width={160}
            height={42}
            className="h-10 w-auto"
          />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} OpenShop. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
