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
  matchCount?: number
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
        // Check if we've already processed this item
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
        
        const newItem = {
          id: item.id,
          title: item.title,
          description: item.description,
          content_type: item.content_type,
          content_data: item.content_data,
          file_url: item.file_url,
          matchCount: matchCount
        }
        
        acc.push(newItem)
        
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