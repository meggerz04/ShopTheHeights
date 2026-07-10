import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert a users row — idempotent on repeat logins
      const admin = createAdminClient()
      const existingUser = await admin
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existingUser.data) {
        await admin.from('users').insert({
          id: data.user.id,
          full_name:
            data.user.user_metadata?.full_name ??
            data.user.email?.split('@')[0] ??
            'New User',
          role: 'smb_owner',
        })
      }

      // New users go to the onboarding wizard; returning users go to dashboard
      const isNewUser = !existingUser.data
      const redirectTo = isNewUser ? '/app/business/setup' : next

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
