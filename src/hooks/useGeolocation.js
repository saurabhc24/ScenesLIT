import { useState, useEffect, useRef } from 'react'

const LS_PERM = 'sceneslit_permission'
const LS_LOC  = 'sceneslit_location'
const LOC_TTL = 24 * 60 * 60 * 1000 // 24 h

// ─── localStorage helpers ──────────────────────────────────────────────────
function getPermission() {
  try { return localStorage.getItem(LS_PERM) } catch { return null }
}
function setPermission(v) {
  try { localStorage.setItem(LS_PERM, v) } catch {}
}
function getCachedLoc() {
  try {
    const raw = localStorage.getItem(LS_LOC)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > LOC_TTL) return null
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    if (!isFinite(lat) || !isFinite(lng)) return null
    return { lat, lng }
  } catch { return null }
}
function setCachedLoc(lat, lng) {
  try {
    localStorage.setItem(LS_LOC, JSON.stringify({ lat, lng, ts: Date.now() }))
  } catch {}
}

const MUMBAI = { lat: 18.9388, lng: 72.8354 }

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useGeolocation() {
  const [location, setLocation]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const perm = getPermission()

    // ── First visit: show dialog after short delay ─────────────────────────
    if (perm === null) {
      const t = setTimeout(() => setShowDialog(true), 600)
      return () => clearTimeout(t)
    }

    // ── City was manually selected: restore from cache ─────────────────────
    if (perm === 'city') {
      const cached = getCachedLoc()
      setLocation(cached ?? MUMBAI)
      return
    }

    // ── Location was previously granted: restore cache or re-request ───────
    if (perm === 'granted') {
      const cached = getCachedLoc()
      if (cached) {
        setLocation(cached)
      } else {
        doRequestLocation()
      }
    }
  }, [])

  // ── Browser geolocation → IP fallback → Mumbai ──────────────────────────
  function doRequestLocation() {
    setLoading(true)

    async function ipFallback() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = res.ok ? await res.json() : null
        const lat = Number(data?.latitude)
        const lng = Number(data?.longitude)
        if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
          const loc = { lat, lng }
          setCachedLoc(lat, lng)
          setLocation(loc)
          return
        }
      } catch { /* ignore */ }
      // Last resort
      setCachedLoc(MUMBAI.lat, MUMBAI.lng)
      setLocation(MUMBAI)
    }

    if (!navigator.geolocation) {
      ipFallback().finally(() => setLoading(false))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (isFinite(lat) && isFinite(lng)) {
          const loc = { lat, lng }
          setCachedLoc(lat, lng)
          setLocation(loc)
        } else {
          ipFallback()
        }
        setLoading(false)
      },
      () => {
        ipFallback().finally(() => setLoading(false))
      },
      { timeout: 10000, enableHighAccuracy: false },
    )
  }

  // ── Called when user taps "Allow Location" ───────────────────────────────
  function handleAllow() {
    setShowDialog(false)
    setPermission('granted')
    doRequestLocation()
  }

  // ── Called when user picks a city from the dialog ────────────────────────
  function handleSelectCity(lat, lng) {
    setShowDialog(false)
    setPermission('city')
    const loc = { lat: Number(lat), lng: Number(lng) }
    setCachedLoc(loc.lat, loc.lng)
    setLocation(loc)
  }

  return { location, loading, showDialog, handleAllow, handleSelectCity }
}
