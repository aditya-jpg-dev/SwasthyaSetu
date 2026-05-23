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

function jitsiLink(id: string) {
  return `https://meet.jit.si/SwasthyaSetu-${id}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { action } = await req.json() as { action: 'accept' | 'reject' }
    const supabase = await createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const effectiveRole = profile?.role ?? user.user_metadata?.role
    if (effectiveRole !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can take this action' }, { status: 403 })
    }

    const { data: doctorStatus } = await supabase
      .from('doctors')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (!doctorStatus?.is_active) {
      return NextResponse.json({ error: 'Activate your doctor status to accept instant requests' }, { status: 400 })
    }

    if (action === 'accept') {
      const nowIso = new Date().toISOString()

      const { data: pendingAppointment } = await supabase
        .from('appointments')
        .select('call_type')
        .eq('id', id)
        .is('doctor_id', null)
        .eq('status', 'pending')
        .gt('scheduled_at', nowIso)
        .single()

      if (!pendingAppointment) {
        return NextResponse.json({ error: 'Already accepted by another doctor' }, { status: 409 })
      }

      const meetLink = pendingAppointment.call_type === 'video' ? jitsiLink(id) : null

      // Atomic: only succeeds if still unclaimed
      const { data, error } = await supabase
        .from('appointments')
        .update({ doctor_id: user.id, status: 'confirmed', meet_link: meetLink })
        .eq('id', id)
        .is('doctor_id', null)
        .eq('status', 'pending')
        .gt('scheduled_at', nowIso)
        .select()
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Already accepted by another doctor' }, { status: 409 })
      }

      return NextResponse.json({ appointment: data })
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('appointment_rejections')
        .insert({ appointment_id: id, doctor_id: user.id })

      if (error && error.code !== '23505' && error.code !== '42P01') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Immediate request action error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
