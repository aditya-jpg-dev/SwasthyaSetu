'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/i18n/LangContext'

export default function Home() {
  const { t, lang, setLang } = useLang()
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  const languages = [
    { code: 'en' as const, label: 'English' },
    { code: 'hi' as const, label: 'हिंदी' },
    { code: 'mr' as const, label: 'मराठी' },
  ]

  const currentLanguage = languages.find((l) => l.code === lang)?.label ?? 'English'

  const stats = [
    { value: '50,000+', label: t('landing.stats_consultations') },
    { value: '1,200+', label: t('landing.stats_doctors') },
    { value: '8 min', label: t('landing.stats_response') },
    { value: '18', label: t('landing.stats_states') },
  ]

  const steps = [
    { n: '01', icon: '💬', title: t('landing.step1_title'), desc: t('landing.step1_desc') },
    { n: '02', icon: '📅', title: t('landing.step2_title'), desc: t('landing.step2_desc') },
    { n: '03', icon: '🩺', title: t('landing.step3_title'), desc: t('landing.step3_desc') },
  ]

  const features = [
    { icon: '📶', title: t('landing.feature1_title'), desc: t('landing.feature1_desc') },
    { icon: '🌐', title: t('landing.feature2_title'), desc: t('landing.feature2_desc') },
    { icon: '🤖', title: t('landing.feature3_title'), desc: t('landing.feature3_desc') },
    { icon: '🚑', title: t('landing.feature4_title'), desc: t('landing.feature4_desc') },
    { icon: '📋', title: t('landing.feature5_title'), desc: t('landing.feature5_desc') },
    { icon: '🔒', title: t('landing.feature6_title'), desc: t('landing.feature6_desc') },
  ]

  const testimonials = [
    {
      initials: 'RP',
      color: 'bg-emerald-100 text-emerald-700',
      name: t('landing.testimonial1_name'),
      location: t('landing.testimonial1_location'),
      quote: t('landing.testimonial1_quote'),
    },
    {
      initials: 'SD',
      color: 'bg-blue-100 text-blue-700',
      name: t('landing.testimonial2_name'),
      location: t('landing.testimonial2_location'),
      quote: t('landing.testimonial2_quote'),
    },
    {
      initials: 'KS',
      color: 'bg-purple-100 text-purple-700',
      name: t('landing.testimonial3_name'),
      location: t('landing.testimonial3_location'),
      quote: t('landing.testimonial3_quote'),
    },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!langMenuRef.current) return
      if (langMenuRef.current.contains(event.target as Node)) return
      setLangMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg text-white">
              🩺
            </span>
            <span className="text-lg font-bold text-slate-900">{t('app_name')}</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">{t('nav.how_it_works')}</a>
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">{t('nav.features')}</a>
            <a href="#about" className="text-sm font-medium text-slate-600 transition hover:text-emerald-600">{t('nav.about')}</a>
          </nav>

          <div className="flex items-center gap-3">
            <div ref={langMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <span>🌐</span>
                <span>{currentLanguage}</span>
                <span className={`transition ${langMenuOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                        setLangMenuOpen(false)
                      }}
                      className={[
                        'w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition',
                        lang === l.code
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      ].join(' ')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition hover:text-emerald-600 md:block">
              {t('nav.login')}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t('nav.get_started')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-6 pb-24 pt-20 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white/90">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
              {t('landing.hero_badge')}
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
              {t('landing.hero_title')}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-emerald-100 md:text-xl">
              {t('landing.hero_subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
              >
                {t('landing.cta_patient')}
              </Link>
              <Link
                href="/signup?role=doctor"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                {t('landing.cta_doctor')}
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/10 px-4 py-5 backdrop-blur-sm">
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="mt-1 text-sm text-emerald-200">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-amber-50 px-6 py-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">{t('landing.reality_label')}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-800 md:text-3xl">
              {t('landing.reality_text')} <span className="text-amber-600">50 km</span> {t('landing.reality_text2')}{' '}
              <span className="text-emerald-600">8 minutes</span>.
            </h2>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">{t('landing.process_label')}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">{t('landing.process_title')}</h2>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.n} className="relative">
                  {i < steps.length - 1 && (
                    <div
                      className="absolute left-full top-10 hidden h-px w-full -translate-y-0 border-t-2 border-dashed border-emerald-200 md:block"
                      style={{ width: 'calc(100% - 2rem)', left: 'calc(100% + 1rem)' }}
                    />
                  )}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-7 shadow-sm transition hover:shadow-md">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">{step.n}</span>
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-slate-50 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">{t('landing.features_label')}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">{t('landing.features_title')}</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('landing.features_subtitle')}</p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="group rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition group-hover:bg-emerald-100">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-slate-800">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">{t('landing.testimonials_label')}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">{t('landing.testimonials_title')}</h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-7 shadow-sm">
                  <div className="mb-5 text-4xl text-slate-300">&quot;</div>
                  <p className="flex-1 text-sm leading-relaxed text-slate-600">{testimonial.quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${testimonial.color}`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{testimonial.name}</p>
                      <p className="text-xs text-slate-400">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="bg-slate-900 px-6 py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">{t('landing.about_label')}</p>
              <h2 className="mt-3 text-3xl font-bold leading-snug">
                {t('landing.about_title')}
              </h2>
              <p className="mt-5 leading-relaxed text-slate-400">
                {t('landing.about_p1')}
              </p>
              <p className="mt-4 leading-relaxed text-slate-400">
                {t('landing.about_p2')}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
                  <p className="text-2xl font-bold text-emerald-400">{t('landing.about_badge1_title')}</p>
                  <p className="mt-1 text-xs text-slate-400">{t('landing.about_badge1_desc')}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
                  <p className="text-2xl font-bold text-emerald-400">{t('landing.about_badge2_title')}</p>
                  <p className="mt-1 text-xs text-slate-400">{t('landing.about_badge2_desc')}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
                  <p className="text-2xl font-bold text-emerald-400">{t('landing.about_badge3_title')}</p>
                  <p className="mt-1 text-xs text-slate-400">{t('landing.about_badge3_desc')}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="flex gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-bold text-white">{t('landing.about_mission_title')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('landing.about_mission_desc')}</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                <span className="text-2xl">🤝</span>
                <div>
                  <h3 className="font-bold text-white">{t('landing.about_commitment_title')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('landing.about_commitment_desc')}</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-bold text-white">{t('landing.about_tech_title')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('landing.about_tech_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-emerald-50 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <span className="text-3xl">👨‍⚕️</span>
            <h2 className="mt-4 text-3xl font-bold text-slate-800">{t('landing.doctor_cta_title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              {t('landing.doctor_cta_desc')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup?role=doctor"
                className="rounded-full bg-emerald-600 px-8 py-4 font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                {t('landing.doctor_cta_join')}
              </Link>
              <Link
                href="/login"
                className="rounded-full border-2 border-emerald-600 px-8 py-4 font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                {t('landing.doctor_cta_login')}
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold md:text-4xl">{t('landing.final_cta_title')}</h2>
          <p className="mt-3 text-emerald-100">{t('landing.final_cta_subtitle')}</p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
          >
            {t('landing.final_cta_btn')}
          </Link>
        </section>
      </main>

      <footer className="bg-slate-900 px-6 py-14 text-slate-400">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white">🩺</span>
                <span className="font-bold text-white">{t('app_name')}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                {t('landing.footer_tagline')}
              </p>
              <p className="mt-4 text-xs">{t('landing.footer_made')}</p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">{t('landing.footer_patients')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="transition hover:text-white">{t('landing.footer_book')}</Link></li>
                <li><Link href="/ai-chat" className="transition hover:text-white">{t('landing.footer_ai')}</Link></li>
                <li><Link href="/emergency" className="transition hover:text-white">{t('landing.footer_emergency')}</Link></li>
                <li><Link href="/prescriptions" className="transition hover:text-white">{t('landing.footer_prescriptions')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">{t('landing.footer_doctors')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup?role=doctor" className="transition hover:text-white">{t('landing.footer_join')}</Link></li>
                <li><Link href="/login" className="transition hover:text-white">{t('landing.footer_doctor_login')}</Link></li>
                <li><a href="#how-it-works" className="transition hover:text-white">{t('landing.footer_how')}</a></li>
                <li><a href="#" className="transition hover:text-white">{t('landing.footer_earnings')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">{t('landing.footer_company')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="transition hover:text-white">{t('landing.footer_about')}</a></li>
                <li><a href="#" className="transition hover:text-white">{t('landing.footer_privacy')}</a></li>
                <li><a href="#" className="transition hover:text-white">{t('landing.footer_terms')}</a></li>
                <li><a href="mailto:support@swasthyasetu.in" className="transition hover:text-white">{t('landing.footer_contact')}</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
            <p className="text-xs">{t('landing.footer_rights')}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-900 px-3 py-1 text-emerald-400">Emergency: 108</span>
              <span className="rounded-full bg-slate-800 px-3 py-1">support@swasthyasetu.in</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
