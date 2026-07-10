import type { WizardData } from './SetupWizard'

interface Props {
  data: WizardData
  update: (patch: Partial<WizardData>) => void
  onNext: () => void
}

export default function Step1Profile({ data, update, onNext }: Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Account & Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Tell us a bit about yourself.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          value={data.full_name}
          onChange={(e) => update({ full_name: e.target.value })}
          placeholder="Jane Smith"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Phone number <span className="text-slate-400">(optional)</span>
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
          placeholder="+1 (555) 000-0000"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        Continue →
      </button>
    </form>
  )
}
