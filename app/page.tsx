/* APP LANDING PAGE */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Tag {
  id: string
  name: string
}

export default function HomePage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showTags, setShowTags] = useState(false)
  const [bgImage, setBgImage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchBackground() {
      const { data, error } = await supabase
        .from('content_items')
        .select('content_data, file_url')
        .eq('content_type', 'image')
        .eq('is_starred', true)
        .order('created_at', { ascending: true }) // Add consistent ordering
      
      if (data && data.length > 0) {
        const index = Math.floor(Date.now() / 10000) % data.length // Cycles every 10 seconds
        const selectedImage = data[index]
        const imageUrl = selectedImage.file_url || selectedImage.content_data.imageUrl
        setBgImage(imageUrl)
      }
      
      setLoading(false)
    }
    
    fetchBackground()
  }, [])
  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      
      if (data) setTags(data)
    }
    fetchTags()
  }, [])

  const toggleTag = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleSubmit = () => {
    if (selected.size === 0) return
    const tagIds = Array.from(selected).join(',')
    router.push(`/results?tags=${tagIds}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {bgImage && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 longlogo">
        <img src="/images/logo-skc.png" alt="sadkidsclub" />
        
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowTags(!showTags)}
            className="text-3xl hover:invert transition-transform"
            aria-label="Toggle tag selection"
          >
            💭
          </button>
        </div>
      </div>
      
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-8 z-10">
        <div 
          className={`overflow-hidden transition-all duration-700 ease-in-out ${
            showTags ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="grid grid-cols-2 gap-4 mb-8">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={selected.has(tag.id) ? 'selected' : ''}
              >
                 {tag.name}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0}
              className="text-button animate-pulse"
            >
              generate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}