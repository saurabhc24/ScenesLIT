import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CITY_CENTERS = [
  { name: 'Mumbai',    lat: 18.9388, lng: 72.8354 },
  { name: 'Delhi',     lat: 28.6139, lng: 77.2090 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai',   lat: 13.0827, lng: 80.2707 },
  { name: 'Pune',      lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata',   lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Goa',       lat: 15.2993, lng: 74.1240 },
]

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useEvents({ searchTerm = '', categoryId = null, lat = null, lng = null, radiusKm = 50 } = {}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEvents() {
      if (!supabase) { setLoading(false); return }
      if (lat == null || lng == null) { setEvents([]); setLoading(false); return }
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

      // Server-side pre-filter: only fetch cities within radiusKm of center
      if (lat != null && lng != null) {
        const nearbyCities = CITY_CENTERS
          .filter(c => haversineKm(lat, lng, c.lat, c.lng) <= radiusKm)
          .map(c => c.name)
        if (nearbyCities.length > 0) {
          query = query.in('city', nearbyCities)
        }
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Client-side precise filter: venue must be within radiusKm
      let result = data || []
      if (lat != null && lng != null) {
        result = result.filter(e => {
          const vLat = e.venues?.latitude
          const vLng = e.venues?.longitude
          if (vLat == null || vLng == null) return false
          return haversineKm(lat, lng, vLat, vLng) <= radiusKm
        })
      }

      setEvents(result)
      setLoading(false)
    }

    fetchEvents()
  }, [searchTerm, categoryId, lat, lng, radiusKm])

  return { events, loading, error }
}
