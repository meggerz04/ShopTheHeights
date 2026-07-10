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

const STAGES = ['Exploring', 'Planning', 'Launching', 'Operating', 'Growing']

const GOALS = [
  'Open a brick-and-mortar location',
  'Get fully licensed and permitted',
  'Understand local zoning for my address',
  'Renew or maintain existing permits',
  'Just exploring what it takes',
]

interface BusinessType {
  id: string
  name: string
}

export default function Step2Business({ data, update, onBack, onNext }: Props) {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('business_types')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setBusinessTypes(data)
      })
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Business Info</h2>
        <p className="text-sm text-slate-500 mt-1">Tell us about the business you&apos;re opening.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
        <input
          type="text"
          value={data.business_name}
          onChange={(e) => update({ business_name: e.target.value })}
          placeholder="I don't have one yet"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Business type <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={data.business_type_id}
          onChange={(e) => update({ business_type_id: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a type…</option>
          {businessTypes.map((bt) => (
            <option key={bt.id} value={bt.id}>{bt.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Where are you in the process? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => update({ current_stage: stage })}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                data.current_stage === stage
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Primary goal <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={data.primary_goal}
          onChange={(e) => update({ primary_goal: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select your main goal…</option>
          {GOALS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
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
