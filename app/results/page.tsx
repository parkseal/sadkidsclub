'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ContentItem {
  id: string
  title: string
  description: string
  content_type: string
  content_data: any
  file_url: string | null
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContent() {
      const keywordIds = searchParams.get('keywords')?.split(',') || []
      
      if (keywordIds.length === 0) {
        setLoading(false)
        return
      }

      // Query content that matches ALL selected keywords
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          content_keywords!inner(keyword_id)
        `)
        .in('content_keywords.keyword_id', keywordIds)

      if (data) {
        // Filter to only items that have ALL selected keywords
        const filtered = data.filter(item => {
          const itemKeywords = item.content_keywords.map((ck: any) => ck.keyword_id)
          return keywordIds.every(kid => itemKeywords.includes(kid))
        })
        
        setContent(filtered)
      }
      
      setLoading(false)
    }

    fetchContent()
  }, [searchParams])

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to selection
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Resources for You</h1>

        {content.length === 0 ? (
          <p className="text-gray-600">No resources found for this combination. Try different keywords.</p>
        ) : (
          <div className="space-y-6">
            {content.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                <p className="text-gray-600 mb-4">{item.description}</p>
                
                {item.content_type === 'text' && (
                  <div className="prose">{item.content_data.text}</div>
                )}
                
                {item.content_type === 'link' && (
                  <a 
                    href={item.content_data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {item.content_data.linkText || 'Visit Link'}
                  </a>
                )}
                
                {item.content_type === 'image' && item.file_url && (
                  <img src={item.file_url} alt={item.title} className="max-w-full rounded" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}