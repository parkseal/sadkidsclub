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
  is_starred?: boolean
}

export default function ResultsContent() {
  const searchParams = useSearchParams()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  async function fetchContent() {
    const tagIds = searchParams.get('tags')?.split(',') || []
    
    if (tagIds.length === 0) {
      setLoading(false)
      return
    }

    // Get all content that matches ANY of the selected tags
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_tags!inner(tag_id)
      `)
      .in('content_tags.tag_id', tagIds)

    if (data) {
      // Count how many selected tags each item matches
      const contentWithScores = data.reduce((acc: any[], item) => {
        // Check if we've already processed this item (due to multiple tag matches)
        const existing = acc.find(i => i.id === item.id)
        
        if (existing) {
          return acc
        }

        // Get all tags for this item
        const itemTags = data
          .filter(d => d.id === item.id)
          .map((d: any) => d.content_tags.tag_id)
        
        // Count matches
        const matchCount = tagIds.filter(kid => itemTags.includes(kid)).length
        
        acc.push({
          ...item,
          matchCount,
          content_tags: undefined // Clean up
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
        Nothing found. Try different tags.
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