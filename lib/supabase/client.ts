import { createBrowserClient } from '@supabase/ssr'

const MAX_AGE = 60 * 60 * 24 * 365

function parseBrowserCookies(): Array<{ name: string; value: string }> {
  if (typeof document === 'undefined') return []
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map(c => {
      const idx = c.indexOf('=')
      return { name: c.slice(0, idx), value: c.slice(idx + 1) }
    })
}

function setCookieRaw(name: string, value: string) {
  document.cookie = `${name}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`
}

function removeCookieRaw(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
}

function lsKeys(): string[] {
  if (typeof localStorage === 'undefined') return []
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('sb-')) keys.push(k)
  }
  return keys
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const browser = parseBrowserCookies()
          const hasAuth = browser.some(c => c.name.startsWith('sb-'))
          if (hasAuth) return browser

          // Cookies limpos pelo browser — restaura do localStorage
          const lsItems: Array<{ name: string; value: string }> = []
          lsKeys().forEach(key => {
            const value = localStorage.getItem(key)
            if (value) {
              lsItems.push({ name: key, value })
              setCookieRaw(key, value) // restaura cookie para SSR funcionar
            }
          })
          return [...browser, ...lsItems]
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => {
            if (value) {
              setCookieRaw(name, value)
              if (typeof localStorage !== 'undefined') localStorage.setItem(name, value)
            } else {
              removeCookieRaw(name)
              if (typeof localStorage !== 'undefined') localStorage.removeItem(name)
            }
          })
        },
      },
    }
  )
}
