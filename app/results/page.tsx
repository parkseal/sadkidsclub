import { Suspense } from 'react'
import ResultsContent from '@/components/ResultsContent'
import Link from 'next/link'

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to selection
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Resources for You</h1>

        <Suspense fallback={<div className="text-center">Loading resources...</div>}>
          <ResultsContent />
        </Suspense>
      </div>
    </main>
  )
}