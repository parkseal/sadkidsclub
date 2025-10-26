'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ContentItem {
  id: string
  title: string
  description: string
  content_type: string
  content_data: any
  file_url: string | null
  matchCount?: number 
}

export default function ResultsContent() {
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

    // Get all content that matches ANY of the selected keywords
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_keywords!inner(keyword_id)
      `)
      .in('content_keywords.keyword_id', keywordIds)

    if (data) {
      // Count how many selected keywords each item matches
      const contentWithScores = data.reduce((acc: any[], item) => {
        // Check if we've already processed this item (due to multiple keyword matches)
        const existing = acc.find(i => i.id === item.id)
        
        if (existing) {
          return acc
        }

        // Get all keywords for this item
        const itemKeywords = data
          .filter(d => d.id === item.id)
          .map((d: any) => d.content_keywords.keyword_id)
        
        // Count matches
        const matchCount = keywordIds.filter(kid => itemKeywords.includes(kid)).length
        
        acc.push({
          ...item,
          matchCount,
          content_keywords: undefined // Clean up
        })
        
        return acc
      }, [])

      // Sort by match count (most matches first)
      contentWithScores.sort((a, b) => b.matchCount - a.matchCount)
      
      setContent(contentWithScores)
    }
    
    setLoading(false)
  }

  fetchContent()
}, [searchParams])

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (content.length === 0) {
    return (
      <p className="text-gray-600">
        No resources found for this combination. Try different keywords.
      </p>
    )
  }

  return (
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
  )
}