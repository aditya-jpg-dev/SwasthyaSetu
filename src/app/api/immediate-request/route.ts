import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const admin = await createAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    if (user) return user
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Patient creates an instant call request (broadcast to all active doctors)
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { callType, symptoms, phone, savePhone } = await req.json()
    const supabase = await createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const effectiveRole = profile?.role ?? user.user_metadata?.role
    if (effectiveRole !== 'patient') {
      return NextResponse.json({ error: 'Only patients can create instant requests' }, { status: 403 })
    }

    if (savePhone && phone) {
      await supabase.from('profiles').update({ phone }).eq('id', user.id)
    }

    const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: null,
        scheduled_at: scheduledAt,
        call_type: callType ?? 'video',
        symptoms: symptoms ?? null,
        is_immediate: true,
        is_emergency: false,
        status: 'pending',
        meet_link: null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ appointment: appt })
  } catch (err) {
    console.error('Immediate request POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Doctor fetches open instant requests (excluding ones they rejected)
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const effectiveRole = profile?.role ?? user.user_metadata?.role
    if (effectiveRole !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can fetch instant requests' }, { status: 403 })
    }

    const { data: doctorStatus } = await supabase
      .from('doctors')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!doctorStatus?.is_active) {
      return NextResponse.json({ requests: [] })
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('is_immediate', true)
      .eq('status', 'pending')
      .is('doctor_id', null)
      .lte('scheduled_at', nowIso)

    const { data: rejections, error: rejectionsError } = await supabase
      .from('appointment_rejections')
      .select('appointment_id')
      .eq('doctor_id', user.id)

    if (rejectionsError && rejectionsError.code !== '42P01') {
      return NextResponse.json({ error: rejectionsError.message }, { status: 500 })
    }

    const rejectedIds = (rejections ?? []).map((r: { appointment_id: string }) => r.appointment_id)

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patient:profiles!appointments_patient_id_fkey(full_name, phone)')
      .eq('is_immediate', true)
      .eq('status', 'pending')
      .is('doctor_id', null)
      .gt('scheduled_at', nowIso)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const filtered = (data ?? []).filter((a: { id: string }) => !rejectedIds.includes(a.id))

    return NextResponse.json({ requests: filtered })
  } catch (err) {
    console.error('Immediate request GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
