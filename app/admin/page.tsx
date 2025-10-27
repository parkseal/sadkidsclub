'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Keyword {
  id: string
  name: string
  contentCount?: number
}

export default function AdminPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  
  // Content form fields
  const [contentTitle, setContentTitle] = useState('')
  const [contentType, setContentType] = useState<'text' | 'quote' | 'link' | 'image' | 'video'>('text')
  
  // Type-specific fields
  const [contentText, setContentText] = useState('')
  const [quote, setQuote] = useState('')
  const [quoteSource, setQuoteSource] = useState('')
  const [quoteSourceUrl, setQuoteSourceUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('')
  const [videoCaption, setVideoCaption] = useState('')
  
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchKeywords()
  }, [])

  async function fetchKeywords() {
    const { data: keywordsData } = await supabase.from('keywords').select('*').order('name')
    
    if (keywordsData) {
      // Fetch content counts for each keyword
      const { data: countsData } = await supabase
        .from('content_keywords')
        .select('keyword_id')
      
      const countMap = new Map()
      countsData?.forEach((row: any) => {
        countMap.set(row.keyword_id, (countMap.get(row.keyword_id) || 0) + 1)
      })
      
      const keywordsWithCounts = keywordsData.map(k => ({
        ...k,
        contentCount: countMap.get(k.id) || 0
      }))
      
      setKeywords(keywordsWithCounts)
    }
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return
    
    const { error } = await supabase
      .from('keywords')
      .insert({ name: newKeyword.toLowerCase().trim() })
    
    if (!error) {
      setNewKeyword('')
      fetchKeywords()
    } else {
      alert('Error adding keyword: ' + error.message)
    }
  }

  async function deleteKeyword(id: string) {
    if (!confirm('Delete this keyword?')) return
    
    await supabase.from('keywords').delete().eq('id', id)
    fetchKeywords()
  }

  async function addContent() {
    if (!contentTitle.trim() || selectedKeywords.size === 0) {
      alert('Title and at least one keyword required')
      return
    }

    let contentData: any = {}
    
    switch (contentType) {
      case 'text':
        if (!contentText.trim()) {
          alert('Text content required')
          return
        }
        contentData = { text: contentText }
        break
      
      case 'quote':
        if (!quote.trim() || !quoteSource.trim()) {
          alert('Quote and source required')
          return
        }
        contentData = { 
          quote, 
          source: quoteSource,
          ...(quoteSourceUrl && { sourceUrl: quoteSourceUrl })
        }
        break
      
      case 'link':
        if (!linkUrl.trim()) {
          alert('URL required')
          return
        }
        contentData = { url: linkUrl }
        break
      
      case 'image':
        if (!imageUrl.trim()) {
          alert('Image URL required')
          return
        }
        contentData = { 
          imageUrl,
          ...(imageCaption && { caption: imageCaption })
        }
        break
      
      case 'video':
        if (!videoEmbedUrl.trim()) {
          alert('Video embed URL required')
          return
        }
        let embedUrl = videoEmbedUrl
        if (videoEmbedUrl.includes('youtube.com/watch')) {
          const videoId = new URL(videoEmbedUrl).searchParams.get('v')
          embedUrl = `https://www.youtube.com/embed/${videoId}`
        } else if (videoEmbedUrl.includes('youtu.be/')) {
          const videoId = videoEmbedUrl.split('youtu.be/')[1].split('?')[0]
          embedUrl = `https://www.youtube.com/embed/${videoId}`
        }
        contentData = { 
          embedUrl,
          ...(videoCaption && { caption: videoCaption })
        }
        break
    }

    const { data: newContent, error: contentError } = await supabase
      .from('content_items')
      .insert({
        title: contentTitle,
        description: '',
        content_type: contentType,
        content_data: contentData
      })
      .select()
      .single()

    if (contentError) {
      alert('Error adding content: ' + contentError.message)
      return
    }

    const keywordLinks = Array.from(selectedKeywords).map(kid => ({
      content_id: newContent.id,
      keyword_id: kid
    }))

    const { error: linkError } = await supabase
      .from('content_keywords')
      .insert(keywordLinks)

    if (linkError) {
      alert('Error linking keywords: ' + linkError.message)
      return
    }

    resetForm()
    fetchKeywords()
    alert('Content added successfully!')
  }

  function resetForm() {
    setContentTitle('')
    setContentText('')
    setQuote('')
    setQuoteSource('')
    setQuoteSourceUrl('')
    setLinkUrl('')
    setImageUrl('')
    setImageCaption('')
    setVideoEmbedUrl('')
    setVideoCaption('')
    setSelectedKeywords(new Set())
  }

  const toggleKeyword = (id: string) => {
    const newSet = new Set(selectedKeywords)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedKeywords(newSet)
  }

  const contentTypes = [
    { value: 'text', label: 'Text' },
    { value: 'quote', label: 'Quote' },
    { value: 'link', label: 'Link' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Add Content Section - Now First */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Add Content</h2>
          
          <div className="space-y-4">
            {/* Content Type Buttons - Now First */}
            <div>
              <p className="font-semibold mb-3">Content Type:</p>
              <div className="flex gap-2 flex-wrap">
                {contentTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value as any)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      contentType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-4 py-2 border rounded"
            />

            {/* Text fields */}
            {contentType === 'text' && (
              <>
                <textarea
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Content text (HTML supported)..."
                  rows={6}
                  className="w-full px-4 py-2 border rounded"
                />
                <p className="text-sm text-gray-600">
                  Supports HTML formatting like &lt;strong&gt;, &lt;em&gt;, &lt;a href=""&gt;, &lt;br&gt;, etc.
                </p>
              </>
            )}

            {/* Quote fields */}
            {contentType === 'quote' && (
              <>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Quote text..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="text"
                  value={quoteSource}
                  onChange={(e) => setQuoteSource(e.target.value)}
                  placeholder="Source name (e.g., Maya Angelou)"
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="url"
                  value={quoteSourceUrl}
                  onChange={(e) => setQuoteSourceUrl(e.target.value)}
                  placeholder="Source URL (optional)"
                  className="w-full px-4 py-2 border rounded"
                />
              </>
            )}

            {/* Link fields */}
            {contentType === 'link' && (
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="URL"
                className="w-full px-4 py-2 border rounded"
              />
            )}

            {/* Image fields */}
            {contentType === 'image' && (
              <>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL"
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Caption (optional, HTML supported)"
                  className="w-full px-4 py-2 border rounded"
                />
                <p className="text-sm text-gray-600">
                  Tip: Use free images from unsplash.com or upload to Supabase Storage. Caption supports HTML like &lt;a href=""&gt;link&lt;/a&gt;
                </p>
              </>
            )}

            {/* Video fields */}
            {contentType === 'video' && (
              <>
                <input
                  type="url"
                  value={videoEmbedUrl}
                  onChange={(e) => setVideoEmbedUrl(e.target.value)}
                  placeholder="YouTube or Vimeo URL"
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="Caption (optional, HTML supported)"
                  className="w-full px-4 py-2 border rounded"
                />
                <p className="text-sm text-gray-600">
                  Accepts: youtube.com/watch?v=..., youtu.be/..., or direct embed URLs. Caption supports HTML.
                </p>
              </>
            )}

            <div>
              <p className="font-semibold mb-2">Select Keywords (at least 1):</p>
              <div className="grid grid-cols-3 gap-2">
                {keywords.map((k: Keyword) => (
                  <button
                    key={k.id}
                    onClick={() => toggleKeyword(k.id)}
                    className={`p-2 rounded border-2 text-sm ${
                      selectedKeywords.has(k.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addContent}
              className="w-full py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
            >
              Add Content
            </button>
          </div>
        </section>

        {/* Keywords Section - Now Second */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Manage Keywords</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="New keyword..."
              className="flex-1 px-4 py-2 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            />
            <button
              onClick={addKeyword}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {keywords.map((k: Keyword) => (
              <div key={k.id} className="flex justify-between items-center p-2 border rounded">
                <div className="flex items-center gap-3">
                  <span>{k.name}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {k.contentCount || 0} content
                  </span>
                </div>
                <button
                  onClick={() => deleteKeyword(k.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}