'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangContext'
import type { Profile, Appointment } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type JoinCountdown = {
  appointmentId: string
  meetLink: string
  doctorName: string
  secondsLeft: number
}

type AppointmentRealtimePayload = {
  new: {
    id: string
    patient_id: string
    doctor_id: string | null
    status: Appointment['status']
    meet_link: string | null
    is_immediate: boolean
  }
}

export default function PatientDashboardPage() {
  const { t } = useLang()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // AI Chat sidebar
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showBookCta, setShowBookCta] = useState(false)
  const [joinCountdown, setJoinCountdown] = useState<JoinCountdown | null>(null)
  const [expiredInstantNotice, setExpiredInstantNotice] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const patientIdRef = useRef<string | null>(null)
  const autoJoinHandledRef = useRef<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startJoinCountdown = useCallback((appointment: Appointment) => {
    if (!appointment.meet_link) return
    if (autoJoinHandledRef.current.has(appointment.id)) return
    autoJoinHandledRef.current.add(appointment.id)
    setJoinCountdown({
      appointmentId: appointment.id,
      meetLink: appointment.meet_link,
      doctorName: appointment.doctor?.full_name ?? 'Doctor',
      secondsLeft: 3,
    })
  }, [])

  const refreshAppointments = useCallback(async (patientId: string) => {
    const supabase = createClient()
    const nowIso = new Date().toISOString()

    const { data: expiredRows } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('patient_id', patientId)
      .eq('is_immediate', true)
      .eq('status', 'pending')
      .is('doctor_id', null)
      .lte('scheduled_at', nowIso)
      .select('id')

    if ((expiredRows?.length ?? 0) > 0) {
      setExpiredInstantNotice('No doctor was available in 10 minutes. Please schedule a regular appointment.')
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = setTimeout(() => {
        setExpiredInstantNotice(null)
      }, 8000)
    }

    const { data: apptData } = await supabase
      .from('appointments')
      .select('*, doctor:profiles!appointments_doctor_id_fkey(full_name, phone)')
      .eq('patient_id', patientId)
      .in('status', ['pending', 'confirmed'])
      .order('scheduled_at', { ascending: true })
      .limit(5)

    const list = (apptData ?? []) as Appointment[]
    setAppointments(list)

    for (const appointment of list) {
      const createdAtMs = appointment.created_at ? new Date(appointment.created_at).getTime() : 0
      const isRecentImmediate = Date.now() - createdAtMs < 30 * 60 * 1000
      if (
        appointment.is_immediate &&
        appointment.status === 'confirmed' &&
        appointment.meet_link &&
        isRecentImmediate
      ) {
        startJoinCountdown(appointment)
        break
      }
    }
  }, [startJoinCountdown])

  useEffect(() => {
    let isMounted = true
    const loadDashboard = async () => {
      try {
        const supabase = createClient()
        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user
        if (!user) { router.push('/login'); return }
        patientIdRef.current = user.id

        const metaRole = user.user_metadata?.role
        if (metaRole && metaRole !== 'patient') { router.push(`/${metaRole}`); return }

        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', user.id).single()

        const resolvedProfile = profileData ?? {
          id: user.id,
          role: user.user_metadata?.role ?? 'patient',
          full_name: user.user_metadata?.full_name ?? user.email ?? '',
          phone: null, lang_pref: 'en', avatar_url: null, created_at: '',
        }

        if (!isMounted) return
        setProfile(resolvedProfile as Profile)
        await refreshAppointments(user.id)
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadDashboard().then(() => {
      if (!isMounted) return
      const patientId = patientIdRef.current
      if (!patientId) return
      pollRef.current = setInterval(() => {
        void refreshAppointments(patientId)
      }, 10000)
    })
    return () => {
      isMounted = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router, refreshAppointments])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const patientId = profile?.id
    if (!patientId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`patient-immediate-${patientId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `patient_id=eq.${patientId}` },
        (payload) => {
          const change = payload as unknown as AppointmentRealtimePayload
          if (!change.new.is_immediate) return
          if (change.new.status === 'confirmed' && change.new.meet_link) {
            void refreshAppointments(patientId)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id, refreshAppointments])

  useEffect(() => {
    if (!joinCountdown) return

    const timer = setTimeout(() => {
      setJoinCountdown((prev) => {
        if (!prev) return prev
        if (prev.secondsLeft <= 1) {
          window.open(prev.meetLink, '_blank', 'noopener,noreferrer')
          return null
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 }
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [joinCountdown])

  const handleLogout = async () => {
    const supabase = createClient()
    await fetch('/auth/signout', { method: 'POST' })
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const updated: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        const lower = data.reply.toLowerCase()
        if (lower.includes('book') || lower.includes('doctor') || lower.includes('urgent') || lower.includes('consult')) {
          setShowBookCta(true)
        }
      }
    } finally {
      setChatLoading(false)
    }
  }

  const getStatusClasses = (status: Appointment['status']) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700'
    if (status === 'pending') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-600'
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const now = new Date()
  const todayAppts = appointments.filter(a => new Date(a.scheduled_at).toDateString() === now.toDateString())

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2 font-bold text-emerald-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white">🩺</span>
            <span className="hidden sm:block">SwasthyaSetu</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              🤖 <span className="hidden sm:block">AI Assistant</span>
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{profile?.full_name ?? ''}</p>
              <p className="text-xs text-slate-500">Patient</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Greeting */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {t('dashboard.patient.greeting')}, {firstName} 👋
              </h1>
              <p className="mt-1 text-sm text-emerald-100">Your health, our priority. How can we help today?</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-2xl font-bold">{todayAppts.length}</p>
              <p className="text-xs text-emerald-200">appointments today</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/book-appointment"
            className="group rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl group-hover:bg-emerald-100 transition">📅</div>
            <h2 className="font-semibold text-slate-800">{t('dashboard.patient.book_consultation')}</h2>
            <p className="mt-1 text-xs text-slate-500">Connect with a specialist now</p>
            <span className="mt-3 inline-block text-xs font-semibold text-emerald-600">Book now →</span>
          </Link>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="group rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 text-left"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-2xl group-hover:bg-violet-100 transition">🤖</div>
            <h2 className="font-semibold text-slate-800">{t('dashboard.patient.chat_with_ai')}</h2>
            <p className="mt-1 text-xs text-slate-500">Describe symptoms, get guidance</p>
            <span className="mt-3 inline-block text-xs font-semibold text-violet-600">Open chat →</span>
          </button>

          <Link
            href="/emergency"
            className="group rounded-2xl bg-red-50 border border-red-100 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-2xl group-hover:bg-red-200 transition">🚑</div>
            <h2 className="font-semibold text-red-700">{t('dashboard.patient.emergency')}</h2>
            <p className="mt-1 text-xs text-red-500">Ambulance & emergency care</p>
            <span className="mt-3 inline-block text-xs font-semibold text-red-600">Get help →</span>
          </Link>
        </section>

        {/* Upcoming Appointments */}
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{t('dashboard.patient.my_appointments')}</h2>
            <Link href="/book-appointment" className="text-xs font-medium text-emerald-600 hover:underline">+ New</Link>
          </div>

          {expiredInstantNotice && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {expiredInstantNotice}
            </div>
          )}

          {appointments.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-2xl">📅</div>
              <p className="font-medium text-slate-700">{t('dashboard.patient.no_appointments')}</p>
              <p className="mt-1 text-sm text-slate-400">Book your first consultation in under 60 seconds</p>
              <Link
                href="/book-appointment"
                className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Book Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const isWaitingInstant = appt.is_immediate && appt.status === 'pending'
                const doctorLabel = isWaitingInstant
                  ? 'Instant Call'
                  : `Dr. ${appt.doctor?.full_name ?? 'Doctor'}`

                return (
                <article key={appt.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800">
                          {doctorLabel}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(appt.status)}`}>
                          {appt.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {appt.call_type === 'video' ? '📹 Video' : '📞 Audio'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-500">
                        {new Date(appt.scheduled_at).toLocaleString('en-IN', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {appt.status === 'confirmed' && appt.meet_link && (
                      <a
                        href={appt.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Join Call
                      </a>
                    )}
                  </div>
                </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Prescriptions link */}
        <Link
          href="/prescriptions"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xl">📋</div>
            <div>
              <p className="font-semibold text-slate-800">{t('dashboard.patient.my_prescriptions')}</p>
              <p className="text-xs text-slate-400">View all past prescriptions</p>
            </div>
          </div>
          <span className="text-slate-400">→</span>
        </Link>
      </main>

      {joinCountdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
            <h2 className="text-xl font-bold text-slate-800">Doctor Found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Dr. <strong>{joinCountdown.doctorName}</strong> accepted your request.
            </p>
            <p className="mt-3 text-4xl font-extrabold text-emerald-600">{joinCountdown.secondsLeft}</p>
            <p className="mt-2 text-xs text-slate-400">Starting your call automatically...</p>
          </div>
        </div>
      )}

      {/* ── AI CHAT SIDEBAR ── */}
      {/* Backdrop */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={[
          'fixed right-0 top-0 z-40 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[420px]',
          chatOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">🤖</div>
            <div>
              <p className="font-bold text-slate-800">AI Health Assistant</p>
              <p className="text-xs text-slate-500">Powered by Groq · Not a real doctor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5 text-center">
              <p className="text-sm font-medium text-violet-800">{t('ai_chat.subtitle')}</p>
              <p className="mt-2 text-xs text-violet-600">I can help you understand symptoms, suggest next steps, and guide you to the right care.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">🤖</div>
              )}
              <div
                className={[
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-emerald-600 text-white'
                    : 'rounded-bl-sm border border-slate-100 bg-white text-slate-800 shadow-sm',
                ].join(' ')}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">🤖</div>
              <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Book CTA */}
        {showBookCta && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-emerald-800">Ready to see a doctor?</p>
              <Link
                href="/book-appointment"
                onClick={() => setChatOpen(false)}
                className="flex-shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 bg-white px-4 py-4">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() }
              }}
              placeholder={t('ai_chat.placeholder')}
              disabled={chatLoading}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              ↑
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">Enter to send · This is not a substitute for a real doctor</p>
        </div>
      </div>

      {/* Floating chat button (when sidebar is closed) */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-2xl text-white shadow-lg transition hover:bg-violet-700 hover:scale-105"
          title="Ask AI Assistant"
        >
          🤖
        </button>
      )}
    </div>
  )
}
