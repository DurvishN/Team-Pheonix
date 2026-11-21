import supabase from './supabase'
export function signInWithGoogle(report: (message: string) => void) {
  const redirectUri = import.meta.env.VITE_GOOGLE_AUTH_PROXY,
    clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!redirectUri || !clientId) {
    report('Google sign-in is unavailable. Please use your email instead.')
    return
  }
  const state = btoa(
    JSON.stringify({
      origin: location.origin,
      appName: 'LeanMonth Planner',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }),
  )
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(state)}`
  const popup = window.open(
    url,
    'google-auth',
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      ? ''
      : 'width=500,height=650',
  )
  if (!popup) {
    report('Allow pop-ups to continue with Google, or sign in with email.')
    return
  }
  const handler = async (e: MessageEvent) => {
    if (e.source !== popup || e.origin !== new URL(redirectUri).origin) return
    if (e.data?.type === 'google-auth-denied') {
      window.removeEventListener('message', handler)
      report('Google sign-in was cancelled.')
      return
    }
    if (e.data?.type !== 'google-auth-success') return
    window.removeEventListener('message', handler)
    const { error } = await supabase.auth.setSession({
      access_token: e.data.access_token,
      refresh_token: e.data.refresh_token,
    })
    if (error) report(error.message)
  }
  window.addEventListener('message', handler)
}
export async function handleGoogleRedirect() {
  if (new URLSearchParams(location.hash.slice(1)).has('google_auth_popup')) {
    const { data } = await supabase.auth.getSession()
    if (data.session) window.close()
  }
}
