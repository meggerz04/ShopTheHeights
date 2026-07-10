import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name, status')
    .eq('owner_id', user.id)

  if (!businesses || businesses.length === 0) {
    redirect('/app/business/setup')
  }

  if (businesses.length === 1) {
    redirect(`/app/business/${businesses[0].id}/tasks`)
  }

  // Multiple businesses — show picker
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Your businesses</h1>
      <div className="space-y-3">
        {businesses.map((biz) => (
          <a
            key={biz.id}
            href={`/app/business/${biz.id}/tasks`}
            className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 transition-colors"
          >
            <p className="font-medium text-slate-900">{biz.name}</p>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{biz.status}</p>
          </a>
        ))}
      </div>
    </main>
  )
}
