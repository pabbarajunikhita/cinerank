import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, UserMetadata } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export type AuthUser = {
  id: string
  email?: string
  user_metadata: UserMetadata
}

// Identifies the signed-in user by verifying their session JWT locally against
// the project's public signing key (ECC P-256), instead of calling Supabase Auth
// over the network on every request the way auth.getUser() does.
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data) return null
  const { sub, email, user_metadata } = data.claims
  return { id: sub, email, user_metadata: user_metadata ?? {} }
}
