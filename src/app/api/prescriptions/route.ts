import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only doctors can write prescriptions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { appointmentId, patientId, content, medicines } = body as {
      appointmentId: string
      patientId: string
      content: string
      medicines: { name: string; dosage: string; duration: string }[]
    }

    if (!appointmentId || !patientId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        appointment_id: appointmentId,
        doctor_id: user.id,
        patient_id: patientId,
        content,
        medicines: medicines ?? [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mark appointment as completed
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)

    // Generate AI summary of the consultation for future context
    const { data: consultation } = await supabase
      .from('consultations')
      .select('messages')
      .eq('appointment_id', appointmentId)
      .single()

    if (consultation?.messages?.length > 0) {
      const summary = `Prescription issued on ${new Date().toLocaleDateString()}: ${content}`
      await supabase
        .from('consultations')
        .update({ summary })
        .eq('appointment_id', appointmentId)
    }

    return NextResponse.json({ prescription })
  } catch (err) {
    console.error('Prescriptions API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('prescriptions')
      .select('*, doctor:profiles!prescriptions_doctor_id_fkey(full_name)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'patient') {
      query = query.eq('patient_id', user.id)
    } else if (profile?.role === 'doctor') {
      query = query.eq('doctor_id', user.id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ prescriptions: data })
  } catch (err) {
    console.error('Prescriptions GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
