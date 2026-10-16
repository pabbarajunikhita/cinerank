'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Shares a Movie Night link. On phones this opens the native share sheet
 * (Messages, WhatsApp, TikTok DMs...); elsewhere it copies the link.
 */
export default function ShareMovieNightButton({ id, friendName }: { id: string; friendName: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}/movie-night/${id}`
    const text = `I found us a movie for tonight 🍿`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Movie Night on CineRank', text, url })
        return
      } catch (err) {
        // Closing the share sheet isn't an error worth falling back on.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      onClick={share}
      className="gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-5 text-white hover:border-neutral-500 hover:bg-neutral-800"
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Link copied' : `Share with ${friendName}`}
    </Button>
  )
}
