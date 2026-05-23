import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create user without email confirmation using admin client
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation
      user_metadata: { full_name: fullName, role },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ user: data.user })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
