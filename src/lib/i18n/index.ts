import en from './en.json'
import hi from './hi.json'
import mr from './mr.json'

export type Lang = 'en' | 'hi' | 'mr'

type TranslationValue = string | { [key: string]: TranslationValue }

const translations: Record<Lang, TranslationValue> = { en, hi, mr }

export function t(lang: Lang, key: string): string {
  const keys = key.split('.')
  let value: TranslationValue | undefined = translations[lang]

  for (const k of keys) {
    if (!value || typeof value === 'string') {
      return key
    }
    value = value[k]
  }

  return typeof value === 'string' ? value : key
}

export const langLabels: Record<Lang, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
}
