import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEvents({ searchTerm = '', categoryId = null } = {}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEvents() {
      if (!supabase) { setLoading(false); return }
      setLoading(true)

      let query = supabase
        .from('events')
        .select('*, venues(name, address, latitude, longitude), categories(name, icon)')
        .order('start_time', { ascending: true })

      if (searchTerm.trim()) {
        const term = searchTerm.trim()
        query = query.or(`title.ilike.%${term}%,source_platform.ilike.%${term}%`)
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setEvents(data || [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [searchTerm, categoryId])

  return { events, loading, error }
}
