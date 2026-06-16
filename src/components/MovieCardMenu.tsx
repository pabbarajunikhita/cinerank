'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Trash2, Pencil } from 'lucide-react'

interface MovieCardMenuProps {
  onDelete: () => void
  onEdit: () => void
}

export default function MovieCardMenu({ onDelete, onEdit }: MovieCardMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden z-50 w-36 shadow-xl">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-neutral-700 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-neutral-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}