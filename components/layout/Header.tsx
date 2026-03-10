'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'

export function Header({ title }: { title: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <Bell size={16} />
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  )
}
