import { computed, readonly, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { sha256Hex } from '~/utils/backupCodec'

// Accounts exist for one reason: cloud backup. The library stays local-first —
// signing in never changes where books are read from, it only adds a copy.
//
// Sign-in paths:
// - Android: the native Google account picker (@capgo/capacitor-social-login)
//   returns an ID token, exchanged with Supabase via signInWithIdToken. Google
//   blocks OAuth pages inside WebViews, so a redirect flow cannot work there.
// - Web: Supabase's standard OAuth redirect, returning to `returnTo`.

const sessionState = ref(null)
const readyState = ref(false)
let clientPromise = null
let initPromise = null

function accountConfig() {
  const config = useRuntimeConfig().public
  return {
    url: String(config.supabaseUrl || ''),
    key: String(config.supabaseKey || ''),
    googleWebClientId: String(config.googleWebClientId || ''),
  }
}

export function isAccountConfigured() {
  const { url, key } = accountConfig()
  return Boolean(url && key)
}

// With CapacitorHttp enabled, window.fetch is routed through the native HTTP
// stack, which round-trips bodies as base64 strings. Binary backup uploads and
// downloads must use the WebView's real fetch, which Capacitor keeps here.
// Supabase serves CORS for any origin, so the WebView fetch is fine.
function webFetch(...args) {
  const real = globalThis.CapacitorWebFetch || globalThis.fetch
  return real(...args)
}

export function getSupabase() {
  if (!import.meta.client || !isAccountConfigured()) return Promise.resolve(null)
  if (!clientPromise) {
    const { url, key } = accountConfig()
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !isNativeCapacitorPlatform(),
        flowType: 'pkce',
        storageKey: 'bookish:auth',
      },
      global: { fetch: webFetch },
    }))
  }
  return clientPromise
}

export function initAccount() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const supabase = await getSupabase()
    if (!supabase) {
      readyState.value = true
      return
    }
    try {
      const { data } = await supabase.auth.getSession()
      sessionState.value = data?.session ?? null
    } catch (error) {
      console.warn('[Account] Could not restore the session:', error)
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      sessionState.value = session ?? null
    })
    readyState.value = true
  })()
  return initPromise
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class AccountSetupError extends Error {}

async function signInNativeGoogle(supabase) {
  const { googleWebClientId } = accountConfig()
  if (!Capacitor.isPluginAvailable('SocialLogin')) {
    throw new AccountSetupError('Update Pages to the latest version to sign in with Google.')
  }
  if (!googleWebClientId) {
    throw new AccountSetupError('Google sign-in is not set up in this build yet.')
  }

  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  await SocialLogin.initialize({ google: { webClientId: googleWebClientId, mode: 'online' } })

  // Google receives the HASH of the nonce, Supabase the raw value; Supabase
  // hashes it and compares with the token's claim, which blocks token replay.
  const rawNonce = randomNonce()
  const hashedNonce = await sha256Hex(new TextEncoder().encode(rawNonce))
  const response = await SocialLogin.login({
    provider: 'google',
    // No `scopes`: name, email and photo are Google's default sign-in claims.
    // Passing scopes switches the plugin to its authorization flow, which
    // refuses to run unless MainActivity is modified for it.
    options: { nonce: hashedNonce },
  })
  const idToken = response?.result?.idToken
  if (!idToken) throw new Error('Google did not return a sign-in token.')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: rawNonce,
  })
  if (error) throw error
  sessionState.value = data.session
  return data.session
}

export const useAccount = () => {
  if (import.meta.client) initAccount()

  const user = computed(() => sessionState.value?.user ?? null)
  const signedIn = computed(() => Boolean(user.value))

  // What Google tells us about the person, used to pre-fill the name step.
  const googleProfile = computed(() => {
    const meta = user.value?.user_metadata || {}
    return {
      name: String(meta.full_name || meta.name || '').trim(),
      givenName: String(meta.given_name || '').trim(),
      email: String(user.value?.email || meta.email || ''),
      avatarUrl: String(meta.avatar_url || meta.picture || ''),
    }
  })

  /**
   * @param {{ returnTo?: string }} options web only: where the OAuth redirect lands
   * @returns {Promise<'signed-in'|'redirecting'>}
   */
  const signInWithGoogle = async ({ returnTo = '/' } = {}) => {
    if (!isAccountConfigured()) {
      throw new AccountSetupError('Accounts are not set up in this build yet.')
    }
    const supabase = await getSupabase()
    if (isNativeCapacitorPlatform()) {
      await signInNativeGoogle(supabase)
      return 'signed-in'
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL(returnTo, window.location.origin).toString() },
    })
    if (error) throw error
    return 'redirecting'
  }

  const signOut = async () => {
    const supabase = await getSupabase()
    if (supabase) await supabase.auth.signOut().catch(() => {})
    sessionState.value = null
    if (isNativeCapacitorPlatform() && Capacitor.isPluginAvailable('SocialLogin')) {
      try {
        const { SocialLogin } = await import('@capgo/capacitor-social-login')
        await SocialLogin.logout({ provider: 'google' })
      } catch {}
    }
  }

  // Cloud files are removed by useCloudBackup().deleteAllCloudData() first;
  // this removes the account itself (rows cascade).
  const deleteAccount = async () => {
    const supabase = await getSupabase()
    if (!supabase) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) throw error
    await signOut()
  }

  return {
    configured: isAccountConfigured(),
    ready: readonly(readyState),
    session: readonly(sessionState),
    user,
    signedIn,
    googleProfile,
    signInWithGoogle,
    signOut,
    deleteAccount,
  }
}
