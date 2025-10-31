/* APP LANDING PAGE */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Tag {
  id: string
  name: string
}

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1590547889805-a71bf012603f',
  'https://images.unsplash.com/photo-1608890457730-84fc54828b50',
  'https://images.unsplash.com/photo-1730132348741-cb45165fe404'
]

export default function HomePage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showTags, setShowTags] = useState(false)
  const [bgImage, setBgImage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const randomImage = BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)]
    setBgImage(randomImage)
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

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.5,
        }}
      />
      <div className="max-w-2xl w-full relative z-10">
        <img src="/images/logo-skc.png" alt="sadkidsclub"></img>
        
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowTags(!showTags)}
            className="text-6xl hover:scale-110 transition-transform cursor-pointer"
            aria-label="Toggle tag selection"
          >
            💭
          </button>
        </div>
        
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
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selected.has(tag.id) ? 'selected' : ''
                }`} 
              >
                 {tag.name}
              </button>
            ))}
          </div>

          <div className="flex justify-center">

          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className={`text-button animate-pulse`}
          >
            generate{Array.from({ length: selected.size }).map((_, i) => (
              <span key={i}> ·</span>
            ))}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}