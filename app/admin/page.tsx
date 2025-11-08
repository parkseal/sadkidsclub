/* ADMIN PAGE */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tag {
  id: string
  name: string
  contentCount?: number
}


export default function AdminPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState('')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editTagName, setEditTagName] = useState('')
  
  const [contentTitle, setContentTitle] = useState('')
  const [contentType, setContentType] = useState<'quote' | 'link' | 'image' | 'video'>('quote')
  
  const [quote, setQuote] = useState('')
  const [quoteSource, setQuoteSource] = useState('')
  const [quoteSourceUrl, setQuoteSourceUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('')
  const [videoCaption, setVideoCaption] = useState('')
  
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [isStarred, setIsStarred] = useState(false) 

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    const { data: tagsData } = await supabase.from('tags').select('*').order('name')
    
    if (tagsData) {
      const { data: countsData } = await supabase
        .from('content_tags')
        .select('tag_id')
      
      const countMap = new Map()
      countsData?.forEach((row: any) => {
        countMap.set(row.tag_id, (countMap.get(row.tag_id) || 0) + 1)
      })
      
      const tagsWithCounts = tagsData.map(k => ({
        ...k,
        contentCount: countMap.get(k.id) || 0
      }))
      
      setTags(tagsWithCounts)
    }
  }

  async function addTag() {
    if (!newTag.trim()) return
    
    const { error } = await supabase
      .from('tags')
      .insert({ name: newTag.toLowerCase().trim() })
    
    if (!error) {
      setNewTag('')
      fetchTags()
    } else {
      alert('Error adding tag: ' + error.message)
    }
  }

  async function startEditTag(tag: Tag) {
    setEditingTag(tag)
    setEditTagName(tag.name)
  }

  async function saveEditTag() {
    if (!editingTag || !editTagName.trim()) return
    
    const { error } = await supabase
      .from('tags')
      .update({ name: editTagName.toLowerCase().trim() })
      .eq('id', editingTag.id)
    
    if (!error) {
      setEditingTag(null)
      setEditTagName('')
      fetchTags()
    } else {
      alert('Error updating tag: ' + error.message)
    }
  }

  async function deleteTag(id: string) {
    if (!confirm('Delete this tag?')) return
    
    await supabase.from('tags').delete().eq('id', id)
    fetchTags()
  }

  async function addContent() {
    if (!contentTitle.trim() || selectedTags.size === 0) {
      alert('Title and at least one tag required')
      return
    }

    let contentData: any = {}
    
    switch (contentType) {
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
        content_data: contentData,
        is_starred: isStarred
      })
      .select()
      .single()

    if (contentError) {
      alert('Error adding content: ' + contentError.message)
      return
    }

    const tagLinks = Array.from(selectedTags).map(kid => ({
      content_id: newContent.id,
      tag_id: kid
    }))

    const { error: linkError } = await supabase
      .from('content_tags')
      .insert(tagLinks)

    if (linkError) {
      alert('Error linking tags: ' + linkError.message)
      return
    }

    resetForm()
    fetchTags()
    
    alert('Content added successfully!')
    setTimeout(() => {
      const alertElement = document.querySelector('[role="alert"]')
      if (alertElement) alertElement.remove()
    }, 100)
  }

  function resetForm() {
    setContentTitle('')
    setQuote('')
    setQuoteSource('')
    setQuoteSourceUrl('')
    setLinkUrl('')
    setImageUrl('')
    setImageCaption('')
    setVideoEmbedUrl('')
    setVideoCaption('')
    setSelectedTags(new Set())
    setIsStarred(false)
  }

  const toggleTag = (id: string) => {
    const newSet = new Set(selectedTags)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTags(newSet)
  }

  const contentTypes = [
    { value: 'quote', label: 'Quote' },
    { value: 'link', label: 'Link' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' }
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <section className="p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Add Content</h2>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isStarred}
                onChange={(e) => setIsStarred(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-semibold">⭐</span>
            </label>
          </div>
          <div className="space-y-4">
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
                  placeholder="Source"
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

            {contentType === 'link' && (
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="URL"
                className="w-full px-4 py-2 border rounded"
              />
            )}

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
              <p className="font-semibold mb-2">Select Tags (at least 1):</p>
              <div className="grid grid-cols-3 gap-2">
                {tags.map((k: Tag) => (
                  <button
                    key={k.id}
                    onClick={() => toggleTag(k.id)}
                    className={`p-2 rounded border-2 text-sm transition-colors ${
                      selectedTags.has(k.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addContent}
              className="w-full py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold transition-colors"
            >
              Add Content
            </button>
          </div>
        </section>

        <section className="p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Manage Tags</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag..."
              className="flex-1 px-4 py-2 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <button
              onClick={addTag}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {tags.map((k: Tag) => (
              <div key={k.id} className="flex justify-between items-center p-2 border rounded">
                {editingTag?.id === k.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                      onKeyPress={(e) => e.key === 'Enter' && saveEditTag()}
                      autoFocus
                    />
                    <button
                      onClick={saveEditTag}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTag(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span>{k.name}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {k.contentCount || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditTag(k)}
                        className="text-blue-500 hover:text-blue-700 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTag(k.id)}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}