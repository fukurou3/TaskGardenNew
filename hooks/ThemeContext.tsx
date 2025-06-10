// hooks/ThemeContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
} from 'react'
import { Appearance } from 'react-native'
import { getItem, setItem } from '@/lib/Storage'

// ユーザーが選べるモード
export type ThemeChoice = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  themeChoice: ThemeChoice
  setThemeChoice: (t: ThemeChoice) => void
  colorScheme: 'light' | 'dark'
  subColor: string
  setSubColor: (color: string) => void
  setTemporaryDarkMode: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  themeChoice: 'light',
  setThemeChoice: () => {},
  colorScheme: 'light',
  subColor: '#4CAF50',
  setSubColor: () => {},
  setTemporaryDarkMode: () => {},
})

// ライト／ダーク判定ヘルパー
function normalizeScheme(scheme?: string | null): 'light' | 'dark' {
  return scheme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    () => normalizeScheme(Appearance.getColorScheme())
  )
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>('light')
  const [subColor, setSubColorState] = useState('#4CAF50') // デフォルト緑
  const [temporaryDarkMode, setTemporaryDarkMode] = useState(false)

  useEffect(() => {
    const sub = Appearance.addChangeListener(evt => {
      setSystemScheme(normalizeScheme(evt.colorScheme))
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    getItem('USER_THEME').then(val => {
      if (val === 'system' || val === 'light' || val === 'dark') {
        setThemeChoiceState(val)
      }
    })
    getItem('USER_SUBCOLOR').then(val => {
      if (val) setSubColorState(val)
    })
  }, [])

  const setThemeChoice = useCallback((t: ThemeChoice) => {
    setThemeChoiceState(t)
    setItem('USER_THEME', t)
  }, [])

  const setSubColor = useCallback((color: string) => {
    setSubColorState(color)
    setItem('USER_SUBCOLOR', color)
  }, [])

  const setTemporaryDarkModeCallback = useCallback((enabled: boolean) => {
    setTemporaryDarkMode(enabled);
  }, [])

  const baseColorScheme: 'light' | 'dark' =
    themeChoice === 'system' ? systemScheme : themeChoice
  
  const colorScheme: 'light' | 'dark' = temporaryDarkMode ? 'dark' : baseColorScheme

  return (
    <ThemeContext.Provider
      value={{ themeChoice, setThemeChoice, colorScheme, subColor, setSubColor, setTemporaryDarkMode: setTemporaryDarkModeCallback }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
