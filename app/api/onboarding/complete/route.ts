import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    full_name,
    phone,
    business_name,
    business_type_id,
    current_stage,
    primary_goal,
    municipality_id,
    zip_code,
    neighborhood,
    work_start_date,
    target_open_date,
    storefront_status,
    completed_milestones,
    serves_alcohol,
    discovery_source,
  } = body

  const admin = createAdminClient()

  // Upsert user profile
  await admin.from('users').upsert({
    id: user.id,
    full_name: full_name || user.email?.split('@')[0] || 'User',
    phone: phone || null,
    role: 'smb_owner',
  })

  // Create the business
  const { data: business, error: bizError } = await admin
    .from('businesses')
    .insert({
      owner_id: user.id,
      municipality_id,
      business_type_id: business_type_id || null,
      name: business_name || "I don't have one yet",
      zip_code: zip_code || null,
      neighborhood: neighborhood || null,
      current_stage: current_stage || null,
      primary_goal: primary_goal || null,
      work_start_date: work_start_date || null,
      target_open_date: target_open_date || null,
      status: 'onboarding',
      characteristics: {
        serves_alcohol: serves_alcohol ?? false,
        storefront_status: storefront_status || null,
        completed_milestones: completed_milestones ?? [],
        discovery_source: discovery_source || null,
      },
    })
    .select('id')
    .single()

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 500 })
  }

  return NextResponse.json({ businessId: business.id })
}
