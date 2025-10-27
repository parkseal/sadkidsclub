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
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Sadkidsclub</h1>
        
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowTags(!showTags)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Toggle tag selection"
          >
            <iframe
              src="https://giphy.com/embed/xX0ezRXQtpVzRXqTeY"
              width="200"
              height="200"
              frameBorder="0"
              className="giphy-embed pointer-events-none"
              allowFullScreen
            />
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
                  selected.has(tag.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            enter
          </button>
        </div>
      </div>
    </div>
  )
}