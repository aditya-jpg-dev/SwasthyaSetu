'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangContext'

type DoctorOption = {
  id: string
  specialty: string | null
  consultation_fee: number
  is_active: boolean
  profiles: { full_name: string | null; phone: string | null } | null
}

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet'

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', color: 'bg-white border-slate-200', icon: '🟢' },
  { id: 'phonepe', label: 'PhonePe', color: 'bg-white border-slate-200', icon: '🟣' },
  { id: 'paytm', label: 'Paytm', color: 'bg-white border-slate-200', icon: '🔵' },
  { id: 'bhim', label: 'BHIM', color: 'bg-white border-slate-200', icon: '🟡' },
]

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank', 'Bank of Baroda']

const WALLETS = [
  { id: 'paytm', label: 'Paytm', icon: '💙' },
  { id: 'amazon', label: 'Amazon Pay', icon: '🟠' },
  { id: 'mobikwik', label: 'MobiKwik', icon: '🔷' },
]

const INSTANT_CONSULTATION_FEE = 150

export default function BookAppointmentPage() {
  const { t } = useLang()
  const router = useRouter()
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [callType, setCallType] = useState<'video' | 'audio'>('video')
  const [symptoms, setSymptoms] = useState('')
  const [phone, setPhone] = useState('')
  const [savePhone, setSavePhone] = useState(true)
  const [mode, setMode] = useState<'scheduled' | 'instant'>('scheduled')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [meetLink, setMeetLink] = useState<string | null>(null)

  // Payment modal
  const [showPayment, setShowPayment] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi')
  const [upiApp, setUpiApp] = useState('gpay')
  const [upiId, setUpiId] = useState('')
  const [cardNum, setCardNum] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')
  const [selectedBank, setSelectedBank] = useState(BANKS[0])
  const [selectedWallet, setSelectedWallet] = useState('paytm')
  const [payProcessing, setPayProcessing] = useState(false)

  const sessionToken = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadDoctors = async () => {
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }

      const { data: { session } } = await supabase.auth.getSession()
      sessionToken.current = session?.access_token ?? null

      // Pre-fill phone from profile
      const { data: profileData } = await supabase.from('profiles').select('phone').eq('id', userData.user.id).single()
      if (profileData?.phone) setPhone(profileData.phone)

      const { data: doctorRows } = await supabase
        .from('doctors').select('id, specialty, consultation_fee, is_active').eq('is_active', true)

      const doctorIds = (doctorRows ?? []).map(d => d.id)
      const { data: profileRows } = doctorIds.length
        ? await supabase.from('profiles').select('id, full_name, phone').in('id', doctorIds)
        : { data: [] }

      const merged = (doctorRows ?? []).map(d => ({
        ...d,
        profiles: profileRows?.find(p => p.id === d.id) ?? null,
      }))

      if (!isMounted) return
      setDoctors(merged as DoctorOption[])
      setLoading(false)
    }
    loadDoctors()
    return () => { isMounted = false }
  }, [router])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => router.push('/patient'), 3000)
    return () => clearTimeout(t)
  }, [router, success])

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mode === 'scheduled' && !selectedDoctor) { setError('Please select a doctor'); return }
    if (mode === 'scheduled' && !scheduledAt) { setError('Please select a date and time'); return }
    if (callType === 'audio' && !phone.trim()) { setError('Please enter your phone number for the audio call'); return }
    setError('')
    // Skip payment only if consultation is truly free
    if (fee === 0) { bookAppointment(); return }
    setShowPayment(true)
  }

  const handlePay = async () => {
    setPayProcessing(true)
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1800))
    setPayProcessing(false)
    setShowPayment(false)
    await bookAppointment()
  }

  const bookAppointment = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'instant') {
        const res = await fetch('/api/immediate-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken.current ? { Authorization: `Bearer ${sessionToken.current}` } : {}),
          },
          body: JSON.stringify({ callType, symptoms, phone, savePhone }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Booking failed'); return }
        setMeetLink(null)
        setSuccess(true)
        return
      }

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken.current ? { Authorization: `Bearer ${sessionToken.current}` } : {}),
        },
        body: JSON.stringify({
          doctorId: selectedDoctor!.id,
          scheduledAt,
          callType,
          symptoms,
          isEmergency: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Booking failed'); return }
      setMeetLink(data.meetLink ?? null)
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  const minDateTime = new Date().toISOString().slice(0, 16)
  const fee = mode === 'instant' ? INSTANT_CONSULTATION_FEE : (selectedDoctor?.consultation_fee ?? 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">✅</div>
          <h1 className="text-2xl font-bold text-slate-800">
            {mode === 'instant' ? 'Request Sent!' : 'Appointment Booked!'}
          </h1>
          {mode === 'instant' ? (
            <p className="mt-3 text-slate-500">
              Your request is now live. An available doctor will accept it within minutes. You will be notified on <strong>{phone}</strong>.
            </p>
          ) : meetLink ? (
            <div className="mt-4">
              <p className="text-slate-500">Your video call room is ready:</p>
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700"
              >
                📹 Join Video Room
              </a>
              <p className="mt-2 text-xs text-slate-400">Save this link — share it with your doctor too</p>
            </div>
          ) : (
            <p className="mt-3 text-slate-500">
              The doctor will call you at <strong>{phone}</strong> at your scheduled time.
            </p>
          )}
          <p className="mt-6 text-xs text-slate-400">Redirecting to dashboard in 3 seconds…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button type="button" onClick={() => router.back()} className="mb-6 flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
          ← Back
        </button>

        <h1 className="mb-6 text-2xl font-bold text-slate-800">{t('appointments.book_title')}</h1>

        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setMode('scheduled')}
            className={[
              'rounded-xl p-4 text-left transition',
              mode === 'scheduled'
                ? 'bg-emerald-50 ring-2 ring-emerald-500'
                : 'border border-slate-100 hover:border-emerald-200',
            ].join(' ')}
          >
            <div className="text-xl mb-1">📅</div>
            <p className="font-semibold text-slate-800">Schedule</p>
            <p className="text-xs text-slate-500">Book a time that suits you</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('instant')}
            className={[
              'rounded-xl p-4 text-left transition',
              mode === 'instant'
                ? 'bg-orange-50 ring-2 ring-orange-400'
                : 'border border-slate-100 hover:border-orange-200',
            ].join(' ')}
          >
            <div className="text-xl mb-1">⚡</div>
            <p className="font-semibold text-slate-800">Call Now</p>
            <p className="text-xs text-slate-500">Connect within 10 minutes · ₹150</p>
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Doctor selection (scheduled only) */}
          {mode === 'scheduled' && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-slate-700">{t('appointments.select_doctor')}</label>
              {doctors.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No doctors available right now. Please try again later.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {doctors.map((doc) => {
                    const selected = selectedDoctor?.id === doc.id
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctor(doc)}
                        className={[
                          'rounded-xl p-4 text-left transition',
                          selected
                            ? 'bg-emerald-50 ring-2 ring-emerald-500'
                            : 'border border-slate-200 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                            {doc.profiles?.full_name?.charAt(0) ?? 'D'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{doc.profiles?.full_name ?? 'Doctor'}</p>
                            <p className="text-xs text-emerald-600">{doc.specialty ?? 'General Physician'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">₹{doc.consultation_fee} · Available now</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Call type */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-semibold text-slate-700">{t('appointments.call_type')}</label>
            <div className="grid grid-cols-2 gap-3">
              {(['video', 'audio'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCallType(type)}
                  className={[
                    'rounded-xl py-3 text-sm font-semibold transition',
                    callType === type ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-emerald-400',
                  ].join(' ')}
                >
                  {type === 'video' ? '📹 Video Call' : '📞 Audio Call'}
                </button>
              ))}
            </div>
            {callType === 'audio' && mode === 'instant' && (
              <p className="mt-2 text-xs text-slate-400">The doctor will call you directly at your phone number.</p>
            )}
          </section>

          {/* Date/time (scheduled only) */}
          {mode === 'scheduled' && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <label htmlFor="scheduledAt" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('appointments.select_date')}
              </label>
              <input
                id="scheduledAt"
                type="datetime-local"
                min={minDateTime}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </section>
          )}

          {/* Phone — only for audio calls */}
          {callType === 'audio' && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-700">
                Your Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={savePhone} onChange={(e) => setSavePhone(e.target.checked)} className="rounded" />
                Save this number to my profile for future calls
              </label>
            </section>
          )}

          {/* Symptoms */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label htmlFor="symptoms" className="mb-2 block text-sm font-semibold text-slate-700">
              {t('appointments.symptoms')}
            </label>
            <textarea
              id="symptoms"
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Fever for 3 days, headache, sore throat…"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </section>

          {/* Payment summary */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">{t('appointments.payment_title')}</h2>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>🔒</span> Secured by Razorpay
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Consultation fee</span>
                <span>₹{fee}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platform fee</span>
                <span className="text-emerald-600">₹0</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (18%)</span>
                <span>₹{Math.round(fee * 0.18)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                <span>Total</span>
                <span>₹{fee + Math.round(fee * 0.18)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">💳 Demo — no real charge will be made</p>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || (mode === 'scheduled' && (!selectedDoctor || !scheduledAt))}
            className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Processing…' : `Proceed to Pay ₹${fee + Math.round(fee * 0.18)}`}
          </button>
        </form>
      </div>

      {/* ── RAZORPAY PAYMENT MODAL ── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 px-3 py-1.5">
                  <span className="text-xs font-bold text-white tracking-wider">razorpay</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">SwasthyaSetu · Secure Checkout</p>
                  <p className="text-lg font-bold text-slate-800">₹{fee + Math.round(fee * 0.18)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Payment methods tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto">
              {([
                { id: 'upi', label: 'UPI' },
                { id: 'card', label: 'Card' },
                { id: 'netbanking', label: 'Net Banking' },
                { id: 'wallet', label: 'Wallets' },
              ] as { id: PaymentMethod; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayMethod(m.id)}
                  className={[
                    'flex-1 whitespace-nowrap px-4 py-3 text-xs font-semibold transition border-b-2',
                    payMethod === m.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Payment method content */}
            <div className="flex-1 overflow-y-auto p-6">
              {payMethod === 'upi' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {UPI_APPS.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setUpiApp(app.id)}
                        className={[
                          'flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition',
                          upiApp === app.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300',
                        ].join(' ')}
                      >
                        <span className="text-2xl mb-1">{app.icon}</span>
                        {app.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or enter UPI ID</span></div>
                  </div>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okaxis"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {payMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Card Number</label>
                    <input
                      type="text"
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())}
                      placeholder="4242 4242 4242 4242"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Name on card"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g,'').slice(0,4).replace(/(.{2})/,'$1/'))}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0,3))}
                        placeholder="•••"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    🔒 Your card details are encrypted with 256-bit SSL
                  </div>
                </div>
              )}

              {payMethod === 'netbanking' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-600">Select your bank</label>
                  <div className="space-y-2">
                    {BANKS.map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={[
                          'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition',
                          selectedBank === bank ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-blue-300',
                        ].join(' ')}
                      >
                        <span>🏦 {bank}</span>
                        {selectedBank === bank && <span className="text-blue-600">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {payMethod === 'wallet' && (
                <div className="space-y-3">
                  {WALLETS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWallet(w.id)}
                      className={[
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition',
                        selectedWallet === w.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-blue-300',
                      ].join(' ')}
                    >
                      <span>{w.icon} {w.label}</span>
                      {selectedWallet === w.id && <span className="text-blue-600">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pay button */}
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={handlePay}
                disabled={payProcessing}
                className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {payProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing Payment…
                  </span>
                ) : (
                  `Pay ₹${fee + Math.round(fee * 0.18)}`
                )}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                🔒 100% secure · Demo payment
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
