'use client'

import { useState, useEffect, Suspense } from 'react'
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
  matchCount?: number
  created_at: string
  keywords?: Array<{ id: string; name: string }>
}

function ContentRenderer({ item }: { item: ContentItem }) {
  switch (item.content_type) {
    case 'text':
      return (
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{item.content_data.text}</p>
        </div>
      )
    
    case 'quote':
      return (
        <div className="border-l-4 border-gray-300 pl-4 italic">
          <p className="text-lg mb-2">"{item.content_data.quote}"</p>
          <div className="text-sm text-gray-600">
            — {item.content_data.source}
            {item.content_data.sourceUrl && (
              <>
                {' '}(
                <a 
                  href={item.content_data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  source
                </a>
                )
              </>
            )}
          </div>
        </div>
      )
    
    case 'link':
      return (
        <a 
          href={item.content_data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {item.title} →
        </a>
      )
    
    case 'image':
      return (
        <div>
          <img 
            src={item.file_url || item.content_data.imageUrl} 
            alt={item.title}
            className="w-full h-auto rounded-lg"
          />
          {item.content_data.caption && (
            <p className="text-sm text-gray-600 mt-2 italic">{item.content_data.caption}</p>
          )}
        </div>
      )
    
    case 'video':
      return (
        <div className="aspect-video">
          <iframe
            src={item.content_data.embedUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg"
          />
        </div>
      )
    
    default:
      return <p className="text-gray-500">Unsupported content type</p>
  }
}

function ContentCard({ item }: { item: ContentItem }) {
  const [expanded, setExpanded] = useState(false)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow break-inside-avoid relative">
      <h2 className="text-xl font-semibold mb-4">{item.content_type === 'link' ? '' : item.title}</h2>
      <ContentRenderer item={item} />
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 mb-2">
            {item.keywords?.map((keyword) => (
              <span 
                key={keyword.id}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {keyword.name}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Posted: {formatDate(item.created_at)}
          </p>
        </div>
      )}
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute bottom-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <svg 
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  )
}

function ResultsContent() {
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

      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          content_keywords!inner(
            keyword_id,
            keywords(id, name)
          )
        `)
        .in('content_keywords.keyword_id', keywordIds)

      if (data) {
        const contentWithScores = data.reduce((acc: any[], item) => {
          const existing = acc.find(i => i.id === item.id)
          
          if (existing) {
            return acc
          }

          const itemKeywords = data
            .filter(d => d.id === item.id)
            .map((d: any) => ({
              id: d.content_keywords.keywords.id,
              name: d.content_keywords.keywords.name
            }))
          
          const itemKeywordIds = itemKeywords.map(k => k.id)
          const matchCount = keywordIds.filter(kid => itemKeywordIds.includes(kid)).length
          
          acc.push({
            ...item,
            matchCount,
            keywords: itemKeywords,
            content_keywords: undefined
          })
          
          return acc
        }, [])

        contentWithScores.sort((a, b) => b.matchCount - a.matchCount)
        
        setContent(contentWithScores)
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to selection
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Resources for You</h1>

        {content.length === 0 ? (
          <p className="text-gray-600">No resources found for this combination. Try different keywords.</p>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {content.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}