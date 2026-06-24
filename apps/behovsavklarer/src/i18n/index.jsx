import { createContext, useContext, useState } from 'react'
import no from './no'
import en from './en'

const LangContext = createContext({ lang: 'no', toggle: () => {} })

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'no')

  function toggle() {
    const next = lang === 'no' ? 'en' : 'no'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  return (
    <LangContext.Provider value={{ lang, toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  const { lang } = useContext(LangContext)
  return lang === 'en' ? en : no
}

export function useLang() {
  return useContext(LangContext)
}
