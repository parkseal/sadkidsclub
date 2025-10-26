'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Keyword {
  id: string
  name: string
}

export default function KeywordSelector({ onSubmit }: { onSubmit: (ids: string[]) => void }) {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchKeywords() {
      const { data } = await supabase
        .from('keywords')
        .select('*')
        .order('name')
      
      if (data) setKeywords(data)
    }
    fetchKeywords()
  }, [])

  const toggleKeyword = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Sadkidsclub</h1>
      <p className="text-gray-600 mb-8">Select what you're feeling:</p>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        {keywords.map((keyword) => (
          <button
            key={keyword.id}
            onClick={() => toggleKeyword(keyword.id)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selected.has(keyword.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {keyword.name}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSubmit(Array.from(selected))}
        disabled={selected.size === 0}
        className="w-full bg-blue-500 text-white py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
      >
        Find Resources ({selected.size})
      </button>
    </div>
  )
}