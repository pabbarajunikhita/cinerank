'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Film } from 'lucide-react'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <nav className="border-b border-neutral-800 bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Film className="text-red-500" size={24} />
          CineRank
        </Link>
      </div>
    </nav>
  )

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Film className="text-red-500" size={24} />
          CineRank
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-neutral-400 hover:text-white text-sm">
                My Rankings
              </Link>
              <Link href={`/u/${user.email?.split('@')[0]}`} className="text-neutral-400 hover:text-white text-sm">
                Profile
              </Link>
              <Button size="sm" onClick={handleSignOut} className="bg-red-500 hover:bg-red-600">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-red-500 hover:bg-red-600">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}