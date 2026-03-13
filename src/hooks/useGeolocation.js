import { useState, useEffect, useCallback } from 'react'

const LS_PERM = 'sceneslit_permission'
const LS_LOC = 'sceneslit_location'
const LOC_TTL = 24 * 60 * 60 * 1000 // 24 h

function readPermission() {
  try { return localStorage.getItem(LS_PERM) } catch { return null }
}
function savePermission(p) {
  try { localStorage.setItem(LS_PERM, p) } catch {}
}
function readCachedLocation() {
  try {
    const raw = localStorage.getItem(LS_LOC)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > LOC_TTL) return null
    if (!isFinite(lat) || !isFinite(lng)) return null
    return { lat, lng }
  } catch { return null }
}
function saveCachedLocation(lat, lng) {
  try { localStorage.setItem(LS_LOC, JSON.stringify({ lat, lng, ts: Date.now() })) } catch {}
}

export function useGeolocation() {
  const [location, setLocation] = useState(() => {
    const perm = readPermission()
    if (perm === 'granted' || perm === 'city') return readCachedLocation()
    return null
  })
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const requestLocation = useCallback(() => {
    setLoading(true)

    const fallbackToIP = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.latitude && data.longitude) {
          const loc = { lat: data.latitude, lng: data.longitude }
          setLocation(loc)
          saveCachedLocation(loc.lat, loc.lng)
        }
      } catch {
        setLocation({ lat: 18.9388, lng: 72.8354 })
      } finally {
        setLoading(false)
      }
    }

    if (!navigator.geolocation) { fallbackToIP(); return }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveCachedLocation(loc.lat, loc.lng)
        setLocation(loc)
        setLoading(false)
      },
      () => fallbackToIP(),
      { timeout: 10000, enableHighAccuracy: true },
    )
  }, [])

  // Show permission dialog on first visit, or auto-request if previously granted
  useEffect(() => {
    const perm = readPermission()
    if (perm === null) {
      const t = setTimeout(() => setShowDialog(true), 600)
      return () => clearTimeout(t)
    }
    if (perm === 'granted' && !location) {
      requestLocation()
    }
  }, [])

  const handleAllow = useCallback(() => {
    setShowDialog(false)
    savePermission('granted')
    requestLocation()
  }, [requestLocation])

  const handleSelectCity = useCallback((lat, lng) => {
    setShowDialog(false)
    savePermission('city')
    const loc = { lat, lng }
    setLocation(loc)
    saveCachedLocation(lat, lng)
  }, [])

  return { location, loading, showDialog, handleAllow, handleSelectCity }
}
