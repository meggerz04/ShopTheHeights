'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Step1Profile from './Step1Profile'
import Step2Business from './Step2Business'
import Step3Location from './Step3Location'
import Step4Milestones from './Step4Milestones'

export type WizardData = {
  // Step 1
  full_name: string
  phone: string
  // Step 2
  business_name: string
  business_type_id: string
  current_stage: string
  primary_goal: string
  // Step 3
  municipality_id: string
  zip_code: string
  neighborhood: string
  work_start_date: string
  target_open_date: string
  storefront_status: string
  // Step 4
  completed_milestones: string[]
  serves_alcohol: boolean
  discovery_source: string
}

const INITIAL: WizardData = {
  full_name: '',
  phone: '',
  business_name: '',
  business_type_id: '',
  current_stage: '',
  primary_goal: '',
  municipality_id: '',
  zip_code: '',
  neighborhood: '',
  work_start_date: '',
  target_open_date: '',
  storefront_status: '',
  completed_milestones: [],
  serves_alcohol: false,
  discovery_source: '',
}

const STEP_TITLES = [
  'Account & Profile',
  'Business Info',
  'Location & Timeline',
  'Milestones & Details',
]

export default function SetupWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  async function handleFinish(finalData: WizardData) {
    setSubmitting(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finalData, userId: user.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong')
      router.push(`/app/business/${json.businessId}/tasks`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  const steps = [
    <Step1Profile key={0} data={data} update={update} onNext={() => setStep(1)} />,
    <Step2Business key={1} data={data} update={update} onBack={() => setStep(0)} onNext={() => setStep(2)} />,
    <Step3Location key={2} data={data} update={update} onBack={() => setStep(1)} onNext={() => setStep(3)} />,
    <Step4Milestones key={3} data={data} update={update} onBack={() => setStep(2)} onFinish={handleFinish} submitting={submitting} />,
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-12 px-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEP_TITLES.map((title, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center border ${
                    i < step
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : i === step
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                  {title}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-200 rounded-full">
            <div
              className="h-1 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((step) / (STEP_TITLES.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8">
          {steps[step]}
          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
