/* ADMIN LAYOUT */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const router = useRouter()

  useEffect(() => {
    const authed = sessionStorage.getItem('admin_authed')
    if (authed === 'true') setIsAuthed(true)
  }, [])

  const handleLogin = () => {
    // Change this password!
    if (password === 'your-secret-password') {
      sessionStorage.setItem('admin_authed', 'true')
      setIsAuthed(true)
    } else {
      alert('Wrong password')
    }
  }

if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-black border border-white p-8 rounded-lg">
          <h1 className="text-2xl font-bold mb-4 text-white">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 border border-white bg-black text-white rounded mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full py-2 bg-white text-black rounded hover:bg-gray-300"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}