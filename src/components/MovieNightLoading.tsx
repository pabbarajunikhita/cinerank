'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Popcorn } from 'lucide-react'

export interface LoadingPerson {
  displayName: string
  avatarUrl: string | null
}

const STEPS = [
  'Comparing your rankings…',
  'Finding where your tastes overlap…',
  'Picking movies neither of you has seen…',
  'Writing a reason for each of you…',
]

function Face({ person }: { person: LoadingPerson }) {
  const initials = person.displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30 [animation-duration:2s]" />
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-xl font-bold ring-4 ring-neutral-950">
          {person.avatarUrl
            ? <Image src={person.avatarUrl} alt={person.displayName} fill sizes="80px" className="object-cover" />
            : initials}
        </div>
      </div>
      <span className="text-sm font-medium text-neutral-300">{person.displayName.split(' ')[0]}</span>
    </div>
  )
}

/** "Finding your match" screen shown while a Movie Night is being planned. */
export default function MovieNightLoading({ me, friend }: { me: LoadingPerson | null; friend: LoadingPerson }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.15),transparent_65%)]" />

      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        <Face person={me ?? { displayName: 'You', avatarUrl: null }} />

        {/* dots travelling between the two of you, with popcorn in the middle */}
        <div className="flex items-center gap-1.5 pb-7">
          {[0, 1, 2].map(i => (
            <span key={`l${i}`} className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
          <div className="mx-2 flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <Popcorn size={22} />
          </div>
          {[0, 1, 2].map(i => (
            <span key={`r${i}`} className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: `${0.45 + i * 0.15}s` }} />
          ))}
        </div>

        <Face person={friend} />
      </div>

      <h2 className="relative mt-8 text-2xl font-bold">Finding your movie match</h2>
      <p key={step} className="relative mt-2 text-neutral-400 animate-in fade-in slide-in-from-bottom-1 duration-500">
        {STEPS[step]}
      </p>

      <div className="relative mx-auto mt-6 flex max-w-[12rem] gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-red-500' : 'bg-neutral-700'}`} />
        ))}
      </div>
    </div>
  )
}
