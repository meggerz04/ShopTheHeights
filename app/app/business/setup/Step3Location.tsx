'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WizardData } from './SetupWizard'

interface Props {
  data: WizardData
  update: (patch: Partial<WizardData>) => void
  onBack: () => void
  onNext: () => void
}

const STOREFRONT_OPTIONS = [
  'Still looking',
  'Have a location in mind',
  'Lease signed',
  'Own the property',
  'Home-based / no storefront',
]

interface Municipality {
  id: string
  name: string
  state: string
}

export default function Step3Location({ data, update, onBack, onNext }: Props) {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('municipalities')
      .select('id, name, state')
      .order('name')
      .then(({ data }) => {
        if (data) setMunicipalities(data)
      })
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Location & Timeline</h2>
        <p className="text-sm text-slate-500 mt-1">
          We use this to pull the right local permits and requirements.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Municipality <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={data.municipality_id}
          onChange={(e) => update({ municipality_id: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select city…</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}, {m.state}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ZIP code <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={data.zip_code}
            onChange={(e) => update({ zip_code: e.target.value })}
            placeholder="07302"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Neighborhood <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={data.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
            placeholder="Downtown, Journal Square…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Storefront status</label>
        <select
          value={data.storefront_status}
          onChange={(e) => update({ storefront_status: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select…</option>
          {STOREFRONT_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            When did you start working on this?
          </label>
          <input
            type="date"
            value={data.work_start_date}
            onChange={(e) => update({ work_start_date: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Target opening date
          </label>
          <input
            type="date"
            value={data.target_open_date}
            onChange={(e) => update({ target_open_date: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 rounded-md bg-slate-900 text-white py-2 text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Continue →
        </button>
      </div>
    </form>
  )
}
