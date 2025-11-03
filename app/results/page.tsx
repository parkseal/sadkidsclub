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
  is_starred?: boolean
}

interface Tag {
  id: string
  name: string
}

function ContentRenderer({ item, onClick }: { item: ContentItem; onClick?: () => void }) {
  const content = (() => {
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
                    onClick={(e) => e.stopPropagation()}
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
            className="inline-block px-4 py-2 transition-colors"
            onClick={(e) => e.stopPropagation()}
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
              className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
          const embedUrl = item.content_data.embedUrl;
          const isDirectVideo = embedUrl.match(/\.(mp4|webm|ogg)$/i) || 
                                (!embedUrl.includes('youtube.com') && 
                                !embedUrl.includes('vimeo.com') && 
                                embedUrl.startsWith('http'));
          
          return (
            <div>
              <div className="aspect-video">
                {isDirectVideo && embedUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={embedUrl}
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    title={item.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full rounded-lg"
                  />
                )}
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
  })()

  return <div onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>{content}</div>
}

function FullscreenModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 fullscreen-modal z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
      >
        ✕
      </button>
      <div 
        className="max-w-7xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ContentRenderer item={item} />
      </div>
    </div>
  )
}

function EditModal({ item, allTags, onClose, onSave }: { 
  item: ContentItem
  allTags: Tag[]
  onClose: () => void
  onSave: (updated: ContentItem) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(item.tags?.map(t => t.id) || [])
  )
  const [isStarred, setIsStarred] = useState(item.is_starred || false)
  
  // Content-type specific fields
  const [contentText, setContentText] = useState(item.content_data.text || '')
  const [quote, setQuote] = useState(item.content_data.quote || '')
  const [quoteSource, setQuoteSource] = useState(item.content_data.source || '')
  const [quoteSourceUrl, setQuoteSourceUrl] = useState(item.content_data.sourceUrl || '')
  const [linkUrl, setLinkUrl] = useState(item.content_data.url || '')
  const [imageUrl, setImageUrl] = useState(item.content_data.imageUrl || '')
  const [imageCaption, setImageCaption] = useState(item.content_data.caption || '')
  const [videoEmbedUrl, setVideoEmbedUrl] = useState(item.content_data.embedUrl || '')
  const [videoCaption, setVideoCaption] = useState(item.content_data.caption || '')

  const toggleTag = (id: string) => {
    const newSet = new Set(selectedTags)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTags(newSet)
  }

  const handleSave = async () => {
    if (!title.trim() || selectedTags.size === 0) {
      alert('Title and at least one tag required')
      return
    }

    let contentData: any = {}
    
    switch (item.content_type) {
      case 'text':
        contentData = { text: contentText }
        break
      case 'quote':
        contentData = { 
          quote, 
          source: quoteSource,
          ...(quoteSourceUrl && { sourceUrl: quoteSourceUrl })
        }
        break
      case 'link':
        contentData = { url: linkUrl }
        break
      case 'image':
        contentData = { 
          imageUrl,
          ...(imageCaption && { caption: imageCaption })
        }
        break
      case 'video':
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

    // Update content item
    const { error: updateError } = await supabase
      .from('content_items')
      .update({
        title,
        description,
        content_data: contentData,
        is_starred: isStarred
      })
      .eq('id', item.id)

    if (updateError) {
      alert('Error updating content: ' + updateError.message)
      return
    }

    // Delete old tag associations
    await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', item.id)

    // Insert new tag associations
    const tagLinks = Array.from(selectedTags).map(tagId => ({
      content_id: item.id,
      tag_id: tagId
    }))

    const { error: linkError } = await supabase
      .from('content_tags')
      .insert(tagLinks)

    if (linkError) {
      alert('Error updating tags: ' + linkError.message)
      return
    }

    // Get updated tag names
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .in('id', Array.from(selectedTags))

    const updatedItem = {
      ...item,
      title,
      description,
      content_data: contentData,
      tags: tagsData || []
    }

    onSave(updatedItem)
    onClose()
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 edit-modal-overlay z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="edit-modal-content rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Edit Content</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded text-gray-800"
            />
          </div>

          {item.content_type === 'text' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Content</label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border rounded text-gray-800"
              />
            </div>
          )}

          {item.content_type === 'quote' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quote</label>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  value={quoteSource}
                  onChange={(e) => setQuoteSource(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Source URL (optional)</label>
                <input
                  type="url"
                  value={quoteSourceUrl}
                  onChange={(e) => setQuoteSourceUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
            </>
          )}

          {item.content_type === 'link' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded text-gray-800"
              />
            </div>
          )}

          {item.content_type === 'image' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
            </>
          )}

          {item.content_type === 'video' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Video URL</label>
                <input
                  type="url"
                  value={videoEmbedUrl}
                  onChange={(e) => setVideoEmbedUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-800"
                />
              </div>
            </>
          )}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStarred}
                  onChange={(e) => setIsStarred(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">⭐ Star this content (for backgrounds)</span>
              </label>
            </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`p-2 rounded border-2 text-sm transition-colors ${
                    selectedTags.has(tag.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 py-2 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
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
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [displayedContent, setDisplayedContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Array<{ id: string; name: string }>>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [fullscreenItem, setFullscreenItem] = useState<ContentItem | null>(null)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const ITEMS_PER_LOAD = 10
  const ITEMS_PER_PAGE = 30
  const [currentPage, setCurrentPage] = useState(1)

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedCards(newSet)
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const deleteContent = async (id: string) => {
    if (!confirm('Delete this content?')) return
    
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting content: ' + error.message)
      return
    }
    
    setAllContent(prev => prev.filter(item => item.id !== id))
    setDisplayedContent(prev => prev.filter(item => item.id !== id))
  }

  const handleSaveEdit = (updatedItem: ContentItem) => {
    setAllContent(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ))
    setDisplayedContent(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ))
  }

  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      
      if (data) setAllTags(data)
    }
    fetchTags()
  }, [])

  useEffect(() => {
    async function fetchContent() {
      const tagIds = searchParams.get('tags')?.split(',') || []
      
      if (tagIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)
      
      if (tagsData) {
        setSelectedTags(tagsData)
      }

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
        
        const contentArray = Array.from(contentMap.values())
        
        contentArray.forEach(item => {
          item.matchCount = item.tags.filter((k: any) => 
            tagIds.includes(k.id)
          ).length
        })
        
        const weightBands = new Map<number, ContentItem[]>()
        contentArray.forEach(item => {
          const count = item.matchCount || 0
          if (!weightBands.has(count)) {
            weightBands.set(count, [])
          }
          weightBands.get(count)!.push(item)
        })
        
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
    const pageMax = currentPage * ITEMS_PER_PAGE
    const nextBatch = allContent.slice(currentLength, Math.min(currentLength + ITEMS_PER_LOAD, pageMax))
    
    if (nextBatch.length > 0) {
      setDisplayedContent(prev => [...prev, ...nextBatch])
      setHasMore(currentLength + nextBatch.length < pageMax && currentLength + nextBatch.length < allContent.length)
    } else {
      setHasMore(false)
    }
  }, [allContent, displayedContent, hasMore, loading, currentPage])

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
    <main className="min-h-screen p-8 results-main">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {selectedTags.map((tag) => (
              <span key={tag.id} className="px-3 py-1 text-sm rounded-full">
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Page {currentPage}</span>
            <Link 
              href="/" 
              className="w-8 h-8 rounded-full hover:flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Back to selection"
            >
              ✕
            </Link>
          </div>
        </div>

        {allContent.length === 0 ? (
          <p className="text-gray-600">Nothing found. Try different tags.</p>
        ) : (
          <>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {displayedContent.map((item, index) => {
                const isExpanded = expandedCards.has(item.id)
                const isFeatured = (index + 1) % 20 === 0
                
                return (
                  <div 
                    key={item.id} 
                    className="p-6 rounded-lg shadow relative results-card break-inside-avoid"
                    style={{
                      width: item.is_starred ? '140%' : isFeatured ? '180%' : '100%',
                      maxWidth: item.is_starred || isFeatured ? 'none' : undefined
                    }}
                  >
                    <ContentRenderer 
                      item={item} 
                      onClick={() => setFullscreenItem(item)}
                    />
                    
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="absolute bottom-4 right-4 text-sm"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.tags?.map((tag) => (
                              <span key={tag.id} className="px-2 py-1 text-xs rounded-full">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-xs mb-3">
                          Posted: {new Date(item.created_at).toLocaleDateString()}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingItem(item)
                            }}
                            className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteContent(item.id)
                            }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {hasMore && (
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-8">
                <div>loading...</div>
              </div>
            )}

            {!hasMore && currentPage * ITEMS_PER_PAGE < allContent.length && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => {
                    const nextPage = currentPage + 1
                    setCurrentPage(nextPage)
                    const pageStart = (nextPage - 1) * ITEMS_PER_PAGE
                    const pageEnd = Math.min(nextPage * ITEMS_PER_PAGE, allContent.length)
                    const nextBatch = allContent.slice(pageStart, Math.min(pageStart + ITEMS_PER_LOAD, pageEnd))
                    setDisplayedContent(nextBatch)
                    setHasMore(nextBatch.length < pageEnd - pageStart)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="px-6 py-3 font-semibold"
                >
                  Next Page ({currentPage + 1})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {fullscreenItem && (
        <FullscreenModal 
          item={fullscreenItem} 
          onClose={() => setFullscreenItem(null)} 
        />
      )}

      {editingItem && (
        <EditModal
          item={editingItem}
          allTags={allTags}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </main>
  )
}