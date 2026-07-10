import type { WizardData } from './SetupWizard'

interface Props {
  data: WizardData
  update: (patch: Partial<WizardData>) => void
  onBack: () => void
  onFinish: (data: WizardData) => void
  submitting: boolean
}

const MILESTONES = [
  'Business concept finalized',
  'Business registered (LLC/Corp/etc.)',
  'EIN obtained',
  'Lease signed',
  'Business bank account opened',
  'Business name / DBA filed',
]

const DISCOVERY_OPTIONS = [
  'Google Search',
  'Instagram',
  'Facebook',
  'Friend / colleague referral',
  'City / government website',
  'Other',
]

export default function Step4Milestones({
  data,
  update,
  onBack,
  onFinish,
  submitting,
}: Props) {
  function toggleMilestone(m: string) {
    const current = data.completed_milestones
    update({
      completed_milestones: current.includes(m)
        ? current.filter((x) => x !== m)
        : [...current, m],
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFinish(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Milestones & Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Check off what you&apos;ve already completed — we&apos;ll mark those tasks done in your workflow.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">What have you already done?</p>
        {MILESTONES.map((m) => (
          <label
            key={m}
            className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={data.completed_milestones.includes(m)}
              onChange={() => toggleMilestone(m)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">{m}</span>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
        <input
          type="checkbox"
          checked={data.serves_alcohol}
          onChange={(e) => update({ serves_alcohol: e.target.checked })}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-slate-700">This business will serve alcohol</span>
          <p className="text-xs text-slate-400">Adds liquor license steps to your workflow</p>
        </div>
      </label>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          How did you hear about OpenShop? <span className="text-slate-400">(optional)</span>
        </label>
        <select
          value={data.discovery_source}
          onChange={(e) => update({ discovery_source: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select…</option>
          {DISCOVERY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Setting up your workspace…' : 'Finish & generate my workflow →'}
        </button>
      </div>
    </form>
  )
}
