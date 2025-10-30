/* RESULTS PAGE */

'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
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
  tags?: Array<{ id: string; name: string }>
}

function ContentRenderer({ item }: { item: ContentItem }) {
  switch (item.content_type) {
    case 'text':
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: item.content_data.text }}
        />
      )
    
    case 'quote':
      return (
        <div className="border-l-4 border-gray-300 pl-4 italic">
          <p className="text-lg mb-2">"{item.content_data.quote}"</p>
          <div className="text-sm">
            — {item.content_data.source}
            {item.content_data.sourceUrl && (
              <>
                {' '}(
                <a 
                  href={item.content_data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
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
            <div 
              className="text-sm text-gray-600 mt-2 italic"
              dangerouslySetInnerHTML={{ __html: item.content_data.caption }}
            />
          )}
        </div>
      )
    
    case 'video':
      return (
        <div>
          <div className="aspect-video">
            <iframe
              src={item.content_data.embedUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </div>
          {item.content_data.caption && (
            <div 
              className="text-sm text-gray-600 mt-2 italic"
              dangerouslySetInnerHTML={{ __html: item.content_data.caption }}
            />
          )}
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
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [displayedContent, setDisplayedContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Array<{ id: string; name: string }>>([])
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const ITEMS_PER_LOAD = 9

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedCards(newSet)
  }

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    async function fetchContent() {
      const tagIds = searchParams.get('tags')?.split(',') || []
      
      if (tagIds.length === 0) {
        setLoading(false)
        return
      }

      // Fetch the selected tags names
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)
      
      if (tagsData) {
        setSelectedTags(tagsData)
      }

      // Use the simpler query approach
      const { data, error } = await supabase
        .from('content_tags')
        .select(`
          tag_id,
          content_items(*),
          tags(*)
        `)
        .in('tag_id', tagIds)

      if (error) {
        console.error('Supabase error:', error)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        // Group by content item
        const contentMap = new Map()
        
        data.forEach((row: any) => {
          const content = row.content_items
          if (!content) return
          
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
              tags: [],
              matchCount: 0
            })
          }
          
          const item = contentMap.get(contentId)
          if (row.tags && !item.tags.find((k: any) => k.id === row.tags.id)) {
            item.tags.push({
              id: row.tags.id,
              name: row.tags.name
            })
          }
        })
        
        // Convert map to array
        const contentArray = Array.from(contentMap.values())
        
        // Calculate match counts
        contentArray.forEach(item => {
          item.matchCount = item.tags.filter((k: any) => 
            tagIds.includes(k.id)
          ).length
        })
        
        // Group by match count
        const weightBands = new Map<number, ContentItem[]>()
        contentArray.forEach(item => {
          const count = item.matchCount || 0
          if (!weightBands.has(count)) {
            weightBands.set(count, [])
          }
          weightBands.get(count)!.push(item)
        })
        
        // Shuffle within each weight band and combine
        const sortedWeights = Array.from(weightBands.keys()).sort((a, b) => b - a)
        const shuffledContent: ContentItem[] = []
        sortedWeights.forEach(weight => {
          const band = weightBands.get(weight)!
          shuffledContent.push(...shuffleArray(band))
        })
        
        setAllContent(shuffledContent)
        setDisplayedContent(shuffledContent.slice(0, ITEMS_PER_LOAD))
        setHasMore(shuffledContent.length > ITEMS_PER_LOAD)
      } else {
        setAllContent([])
        setDisplayedContent([])
      }
      
      setLoading(false)
    }

    fetchContent()
  }, [searchParams])

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    
    const currentLength = displayedContent.length
    const nextBatch = allContent.slice(currentLength, currentLength + ITEMS_PER_LOAD)
    
    if (nextBatch.length > 0) {
      setDisplayedContent(prev => [...prev, ...nextBatch])
      setHasMore(currentLength + nextBatch.length < allContent.length)
    } else {
      setHasMore(false)
    }
  }, [allContent, displayedContent, hasMore, loading])

  useEffect(() => {
    if (loading || !hasMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, hasMore, loadMore])

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Top Right Selection Pills */}
        <div className="flex justify-end items-center gap-2 mb-8">
          
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="px-3 py-1 text-sm rounded-full"
            >
              {tag.name}
            </span>
          ))}
          <Link 
            href="/" 
            className="w-8 h-8 rounded-full hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Back to selection"
          >
            ✕
          </Link>
        </div>

        {allContent.length === 0 ? (
          <p className="text-gray-600">Nothing found. Try different tags.</p>
        ) : (
          <>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {displayedContent.map((item) => {
                const isExpanded = expandedCards.has(item.id)
                
                return (
                  <div key={item.id} className="p-6 rounded-lg shadow break-inside-avoid relative" style={{ background: 'var(--gray)', color: 'var(--foreground)' }}>
                    <ContentRenderer item={item} />
                    
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="absolute bottom-4 right-4 text-sm"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    
                    {/* Expanded Metadata */}
                    {isExpanded && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        {/* Tags Pills */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.tags?.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-1 text-xs rounded-full"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Date */}
                        <div className="text-xs">
                          Posted: {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Loading trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-8">
                <div className="">loading...</div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}