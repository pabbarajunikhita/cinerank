'use client'

import { X } from 'lucide-react'

export default function PhotoLightbox({ url, caption, onClose }: { url: string; caption?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-neutral-300 hover:text-white" aria-label="Close">
          <X size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={caption ?? ''} className="mx-auto max-h-[80vh] rounded-xl object-contain" />
        {caption && <p className="mt-3 text-center text-sm text-neutral-300">{caption}</p>}
      </div>
    </div>
  )
}
