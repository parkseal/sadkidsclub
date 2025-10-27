'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Keyword {
  id: string
  name: string
}

export default function AdminPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  
  // Content form fields
  const [contentTitle, setContentTitle] = useState('')
  const [contentDesc, setContentDesc] = useState('')
  const [contentType, setContentType] = useState<'text' | 'quote' | 'link' | 'image' | 'video'>('text')
  
  // Type-specific fields
  const [contentText, setContentText] = useState('')
  const [quote, setQuote] = useState('')
  const [quoteSource, setQuoteSource] = useState('')
  const [quoteSourceUrl, setQuoteSourceUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('')
  
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchKeywords()
  }, [])

  async function fetchKeywords() {
    const { data } = await supabase.from('keywords').select('*').order('name')
    if (data) setKeywords(data)
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
        contentData = { 
          url: linkUrl, 
          linkText: linkText || 'Visit Link' 
        }
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
        // Convert regular YouTube URLs to embed format
        let embedUrl = videoEmbedUrl
        if (videoEmbedUrl.includes('youtube.com/watch')) {
          const videoId = new URL(videoEmbedUrl).searchParams.get('v')
          embedUrl = `https://www.youtube.com/embed/${videoId}`
        } else if (videoEmbedUrl.includes('youtu.be/')) {
          const videoId = videoEmbedUrl.split('youtu.be/')[1].split('?')[0]
          embedUrl = `https://www.youtube.com/embed/${videoId}`
        }
        contentData = { embedUrl }
        break
    }

    // Insert content
    const { data: newContent, error: contentError } = await supabase
      .from('content_items')
      .insert({
        title: contentTitle,
        description: contentDesc,
        content_type: contentType,
        content_data: contentData
      })
      .select()
      .single()

    if (contentError) {
      alert('Error adding content: ' + contentError.message)
      return
    }

    // Link to keywords
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

    // Reset form
    resetForm()
    alert('Content added successfully!')
  }

  function resetForm() {
    setContentTitle('')
    setContentDesc('')
    setContentText('')
    setQuote('')
    setQuoteSource('')
    setQuoteSourceUrl('')
    setLinkUrl('')
    setLinkText('')
    setImageUrl('')
    setImageCaption('')
    setVideoEmbedUrl('')
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Keywords Section */}
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
            {keywords.map(k => (
              <div key={k.id} className="flex justify-between items-center p-2 border rounded">
                <span>{k.name}</span>
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

        {/* Add Content Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Add Content</h2>
          
          <div className="space-y-4">
            <input
              type="text"
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-4 py-2 border rounded"
            />
            
            <input
              type="text"
              value={contentDesc}
              onChange={(e) => setContentDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-2 border rounded"
            />

            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as any)}
              className="w-full px-4 py-2 border rounded"
            >
              <option value="text">Text</option>
              <option value="quote">Quote</option>
              <option value="link">Link</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>

            {/* Text fields */}
            {contentType === 'text' && (
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Content text..."
                rows={6}
                className="w-full px-4 py-2 border rounded"
              />
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
              <>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL"
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text (e.g., Visit Crisis Hotline)"
                  className="w-full px-4 py-2 border rounded"
                />
              </>
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
                  placeholder="Caption (optional)"
                  className="w-full px-4 py-2 border rounded"
                />
                <p className="text-sm text-gray-600">
                  Tip: Use free images from unsplash.com or upload to Supabase Storage
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
                <p className="text-sm text-gray-600">
                  Accepts: youtube.com/watch?v=..., youtu.be/..., or direct embed URLs
                </p>
              </>
            )}

            <div>
              <p className="font-semibold mb-2">Select Keywords (at least 1):</p>
              <div className="grid grid-cols-3 gap-2">
                {keywords.map(k => (
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
      </div>
    </div>
  )
}