import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.auth.signOut()
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signout route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
