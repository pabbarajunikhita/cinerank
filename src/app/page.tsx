import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Film } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      <Film className="text-red-500" size={60} />
      <h1 className="text-5xl font-bold">Rank Your Movies</h1>
      <p className="text-neutral-400 text-xl max-w-md">
        Don't rate movies. Rank them. See how your taste compares to your friends.
      </p>
      <div className="flex gap-4">
        <Link href="/signup">
          <Button className="bg-red-500 hover:bg-red-600 text-lg px-8 py-6">
            Get started
          </Button>
        </Link>
        <Link href="/login">
          <Button className="text-lg px-8 py-6 bg-red-500 hover:bg-red-600">
            Log in
          </Button>
        </Link>
      </div>
    </div>
  )
}