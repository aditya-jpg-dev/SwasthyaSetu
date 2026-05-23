'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangContext'

type RecentAppointment = {
  id: string
  scheduled_at: string
  call_type: 'video' | 'audio'
  status: string
  patient?: { full_name: string | null }
  doctor?: { full_name: string | null }
}

type PendingEmergency = {
  id: string
  created_at: string
  location: string | null
  patient?: { full_name: string | null }
}

export default function AdminDashboardPage() {
  const { t } = useLang()
  const router = useRouter()
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalDoctors, setTotalDoctors] = useState(0)
  const [totalAppointments, setTotalAppointments] = useState(0)
  const [activeDoctors, setActiveDoctors] = useState(0)
  const [emergencyCount, setEmergencyCount] = useState(0)
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [pendingEmergencies, setPendingEmergencies] = useState<PendingEmergency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profileData) {
        router.push('/login')
        return
      }

      if (profileData.role !== 'admin') {
        router.push(`/${profileData.role}`)
        return
      }

      const [
        patientsCount,
        doctorsCount,
        appointmentsCount,
        activeDoctorsCount,
        emergencyCountResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'patient'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'doctor'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase
          .from('doctors')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('emergency_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      const { data: recentAppts } = await supabase
        .from('appointments')
        .select(
          '*, patient:profiles!appointments_patient_id_fkey(full_name), doctor:profiles!appointments_doctor_id_fkey(full_name)'
        )
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: emergencies } = await supabase
        .from('emergency_requests')
        .select('*, patient:profiles!emergency_requests_patient_id_fkey(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!isMounted) {
        return
      }

      setTotalPatients(patientsCount.count ?? 0)
      setTotalDoctors(doctorsCount.count ?? 0)
      setTotalAppointments(appointmentsCount.count ?? 0)
      setActiveDoctors(activeDoctorsCount.count ?? 0)
      setEmergencyCount(emergencyCountResult.count ?? 0)
      setRecentAppointments(recentAppts ?? [])
      setPendingEmergencies(emergencies ?? [])
      setLoading(false)
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await fetch('/auth/signout', { method: 'POST' })
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  const getStatusClasses = (status: string) => {
    if (status === 'confirmed') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-700'
    }

    if (status === 'completed') {
      return 'bg-gray-100 text-gray-700'
    }

    return 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-green-700">
            <span aria-hidden="true">🩺</span>
            <span>{t('app_name')}</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Admin</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-red-500 transition hover:text-red-700"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          {t('dashboard.admin.title')}
        </h1>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <article className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">👥</div>
            <div className="mt-3 text-3xl font-bold text-gray-800">{totalPatients}</div>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.admin.total_patients')}</p>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">🩺</div>
            <div className="mt-3 text-3xl font-bold text-gray-800">{totalDoctors}</div>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.admin.total_doctors')}</p>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">📅</div>
            <div className="mt-3 text-3xl font-bold text-gray-800">{totalAppointments}</div>
            <p className="mt-1 text-sm text-gray-500">
              {t('dashboard.admin.total_appointments')}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">✅</div>
            <div className="mt-3 text-3xl font-bold text-gray-800">{activeDoctors}</div>
            <p className="mt-1 text-sm text-gray-500">{t('dashboard.admin.active_doctors')}</p>
          </article>

          <article
            className={`rounded-2xl p-5 text-center shadow-sm ${
              emergencyCount > 0
                ? 'border border-red-200 bg-red-50'
                : 'border border-gray-100 bg-white'
            }`}
          >
            <div className="text-2xl">🚨</div>
            <div className="mt-3 text-3xl font-bold text-gray-800">{emergencyCount}</div>
            <p className="mt-1 text-sm text-gray-500">
              {t('dashboard.admin.emergency_requests')}
            </p>
          </article>
        </section>

        {pendingEmergencies.length > 0 ? (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold text-red-700">🚨 Pending Emergencies</h2>
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="divide-y divide-red-100">
                {pendingEmergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-sm text-gray-800">
                      <span className="font-medium">
                        {emergency.patient?.full_name ?? '-'}
                      </span>{' '}
                      <span className="text-gray-500">{emergency.location ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">
                        {new Date(emergency.created_at).toLocaleString()}
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-gray-800">Recent Appointments</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Doctor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {appointment.patient?.full_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {appointment.doctor?.full_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(appointment.scheduled_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {appointment.call_type === 'video' ? '📹' : '📞'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/doctors"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden="true">
              🩺
            </span>
            <div>
              <h3 className="font-semibold text-gray-800">Manage Doctors</h3>
              <p className="text-sm text-gray-500">list/activate/deactivate doctors</p>
            </div>
          </Link>

          <Link
            href="/admin/patients"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden="true">
              👥
            </span>
            <div>
              <h3 className="font-semibold text-gray-800">Manage Patients</h3>
              <p className="text-sm text-gray-500">view and support patient records</p>
            </div>
          </Link>

          <Link
            href="/admin/appointments"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden="true">
              📅
            </span>
            <div>
              <h3 className="font-semibold text-gray-800">All Appointments</h3>
              <p className="text-sm text-gray-500">review booking activity</p>
            </div>
          </Link>
        </section>
      </main>
    </div>
  )
}
