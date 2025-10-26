import { Suspense } from 'react'
import ResultsContent from '@/components/ResultsContent'
import Link from 'next/link'

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div key={item.id} className="bg-white p-6 rounded-lg shadow">
  <div className="flex justify-between items-start mb-2">
    <h2 className="text-xl font-semibold">{item.title}</h2>
    {item.matchCount && item.matchCount > 1 && (
      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
        Matches {item.matchCount} topics
      </span>
    )}
  </div>
  <p className="text-gray-600 mb-4">{item.description}</p>
  
  {/* rest of content rendering */}
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
</div>
    </main>
  )
}