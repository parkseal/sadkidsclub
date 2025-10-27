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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedCards(newSet)
  }

  useEffect(() => {
    async function fetchContent() {
      const keywordIds = searchParams.get('keywords')?.split(',') || []
      
      if (keywordIds.length === 0) {
        setLoading(false)
        return
      }

      // Use the simpler query approach
      const { data, error } = await supabase
        .from('content_keywords')
        .select(`
          keyword_id,
          content_items(*),
          keywords(*)
        `)
        .in('keyword_id', keywordIds)

      if (error) {
        console.error('Supabase error:', error)
        setLoading(false)
        return
      }

      console.log('Raw data:', data)

      if (data && data.length > 0) {
        // Group by content item
        const contentMap = new Map()
        
        data.forEach((row: any) => {
          const content = row.content_items
          if (!content) return // Skip if content_items is null
          
          const contentId = content.id
          
          if (!contentMap.has(contentId)) {
            contentMap.set(contentId, {
              id: content.id,
              title: content.title,
              description: content.description,
              content_type: content.content_type,
              content_data: content.content_data,
              file_url: content.file_url,
              created_at: content.created_at,
              keywords: [],
              matchCount: 0
            })
          }
          
          // Add keyword if it exists and isn't already added
          const item = contentMap.get(contentId)
          if (row.keywords && !item.keywords.find((k: any) => k.id === row.keywords.id)) {
            item.keywords.push({
              id: row.keywords.id,
              name: row.keywords.name
            })
          }
        })
        
        // Convert map to array
        const contentArray = Array.from(contentMap.values())
        
        // Calculate match counts
        contentArray.forEach(item => {
          item.matchCount = item.keywords.filter((k: any) => 
            keywordIds.includes(k.id)
          ).length
        })
        
        // Sort by match count
        contentArray.sort((a, b) => b.matchCount - a.matchCount)
        
        console.log('Processed content:', contentArray)
        setContent(contentArray)
      } else {
        setContent([])
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
            {content.map((item) => {
              const isExpanded = expandedCards.has(item.id)
              
              return (
                <div key={item.id} className="bg-white p-6 rounded-lg shadow break-inside-avoid relative">
                  <h2 className="text-xl font-semibold mb-4">{item.title}</h2>
                  <ContentRenderer item={item} />
                  
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="absolute bottom-4 right-4 text-sm text-blue-500 hover:text-blue-700"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                  
                  {/* Expanded Metadata */}
                  {isExpanded && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      {/* Keywords Pills */}
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Keywords:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.keywords?.map((keyword) => (
                            <span
                              key={keyword.id}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {keyword.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Date */}
                      <div className="text-xs text-gray-500">
                        Posted: {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}