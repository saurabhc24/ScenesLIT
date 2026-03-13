import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchCategories() {
      if (!supabase) { setLoading(false); return }

      // Only show categories that have at least one event
      const { data: rows } = await supabase.from('events').select('category_id')
      const ids = [...new Set((rows || []).map(r => r.category_id).filter(Boolean))]

      if (ids.length === 0) { setCategories([]); setLoading(false); return }

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon')
        .in('id', ids)
        .order('name')

      if (error) setError(error.message)
      else setCategories(data || [])
      setLoading(false)
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}
