'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import KeywordSelector from '@/components/KeywordSelector'

export default function Home() {
  const router = useRouter()

  const handleSubmit = (keywordIds: string[]) => {
    // Navigate to results page with selected keywords
    const params = new URLSearchParams()
    params.set('keywords', keywordIds.join(','))
    router.push(`/results?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <KeywordSelector onSubmit={handleSubmit} />
    </main>
  )
}