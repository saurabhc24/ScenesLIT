import { useState, useEffect } from 'react'

const FALLBACK = { lat: 18.9388, lng: 72.8354 } // Mumbai
const CACHE_KEY = 'sceneslit_location'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function writeCache(lat, lng) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }))
  } catch {}
}

export function useGeolocation() {
  // Initialise immediately from cache so map doesn't start at fallback
  const [location, setLocation] = useState(() => readCache())
  const [loading, setLoading] = useState(() => !readCache())

  useEffect(() => {
    // If we already have a valid cached location, skip asking for permission
    if (readCache()) return

    if (!navigator.geolocation) {
      setLocation(FALLBACK)
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        writeCache(loc.lat, loc.lng)
        setLocation(loc)
        setLoading(false)
      },
      () => {
        setLocation(FALLBACK)
        setLoading(false)
      },
      { timeout: 8000 }
    )
  }, [])

  return { location, loading }
}
