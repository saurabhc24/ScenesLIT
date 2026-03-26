import { useState, useRef, useCallback, useEffect } from 'react'
import Navbar from './components/Navbar'
import SidebarPanel from './components/SidebarPanel'
import MapView from './components/MapView'
import EventPopup from './components/EventPopup'
import LocationPermissionDialog from './components/LocationPermissionDialog'
import { useEvents } from './hooks/useEvents'
import { useGeolocation } from './hooks/useGeolocation'


export default function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [hoveredEventId, setHoveredEventId] = useState(null)
  const [showMapOverlay, setShowMapOverlay] = useState(true)
  const [overlayFading, setOverlayFading] = useState(false)
  const desktopMapRef = useRef(null)
  const mobileMapRef = useRef(null)
  const activeMapRef = () => window.innerWidth >= 768 ? desktopMapRef : mobileMapRef

  // Dark mode — persisted to localStorage, toggled via html.dark class
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode') === 'true'
      if (saved) document.documentElement.classList.add('dark')
      return saved
    } catch { return false }
  })
  function toggleDark() {
    setDarkMode(d => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      try { localStorage.setItem('darkMode', String(next)) } catch {}
      return next
    })
  }

  // Debounce search — only fires query 500ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(t)
  }, [searchTerm])

  const { location: userLocation, showDialog, handleAllow, handleSelectCity } = useGeolocation()
  const { events, loading: eventsLoading } = useEvents({ searchTerm: debouncedSearch, categoryId: null, lat: userLocation?.lat ?? null, lng: userLocation?.lng ?? null })

  // Mobile map overlay: fade out when loading completes
  useEffect(() => {
    if (eventsLoading) {
      setShowMapOverlay(true)
      setOverlayFading(false)
    } else {
      setOverlayFading(true)
      const t = setTimeout(() => setShowMapOverlay(false), 700)
      return () => clearTimeout(t)
    }
  }, [eventsLoading])

  // Pan/fit map to search results whenever they change
  useEffect(() => {
    if (eventsLoading || !searchTerm.trim()) return
    activeMapRef().current?.fitEvents(events)
  }, [events]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventClick = useCallback((event) => {
    setSelectedEventId(event.id)
    setSelectedEvent(event)
    const venue = event.venues
    if (venue?.latitude != null && venue?.longitude != null) {
      activeMapRef().current?.flyToEvent(venue.latitude, venue.longitude)
    }
  }, [])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-white dark:bg-gray-900 transition-colors">

      {/* Desktop: navbar */}
      <div className="hidden md:block flex-shrink-0 bg-white dark:bg-gray-900">
        <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} darkMode={darkMode} onToggleDark={toggleDark} />
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden gap-6 px-6 pt-2.5 pb-0">
        <div className="w-96 xl:w-[460px] flex-shrink-0 overflow-hidden">
          <SidebarPanel
            events={events}
            eventsLoading={eventsLoading}
            onEventClick={handleEventClick}
            selectedEventId={selectedEventId}
            onEventHover={setHoveredEventId}
          />
        </div>
        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-[20px] overflow-hidden">
          <MapView ref={desktopMapRef} events={events} userLocation={userLocation} mode="desktop" hoveredEventId={hoveredEventId} darkMode={darkMode} />
        </div>
      </div>

      {/* Mobile layout — 16px padding, 8px gaps */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900 pt-4 px-4 gap-2">
        {/* Mobile header: Logo + Search + Dark toggle */}
        <header className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center select-none flex-shrink-0">
            <img src="/logos/ScenesLIT-logo.svg" alt="ScenesLIT" className="w-auto" style={{ height: 40 }} />
          </div>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search events..."
              aria-label="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <button
            onClick={toggleDark}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {darkMode ? (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="5" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </header>

        {/* Map — fills remaining space, rounded corners, subtle border */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ border: darkMode ? '0.5px solid #374151' : '0.5px solid #C8C8C8' }}>
            <MapView ref={mobileMapRef} events={events} userLocation={userLocation} mode="mobile" darkMode={darkMode} />
          </div>
          {showMapOverlay && (
            <div
              className="absolute inset-0 rounded-2xl z-10 flex items-center justify-center backdrop-blur-md bg-white/30 dark:bg-gray-900/30 transition-opacity duration-700"
              style={{ opacity: overlayFading ? 0 : 1 }}
            >
              <p style={{ fontFamily: "'Funnel Sans', sans-serif", fontWeight: 500, fontSize: 18, textAlign: 'center', padding: '0 32px', lineHeight: 1.4 }} className="text-gray-900 dark:text-gray-100">
                We're lining up your next plans…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="flex-shrink-0 flex items-center justify-center py-2.5"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0.625rem))' }}
      >
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '16px' }} className="text-gray-900 dark:text-gray-300">
          A passion project by{' '}
          <a
            href="https://saurabhchandra.framer.website/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Lobster', cursive", fontSize: '16px', textDecoration: 'none' }}
            className="text-gray-900 dark:text-gray-300"
          >
            Saurabh
          </a>
        </p>
      </footer>

      {/* Event detail popup (sidebar click or long press) */}
      {selectedEvent && (
        <EventPopup event={selectedEvent} onClose={() => { setSelectedEvent(null); setSelectedEventId(null) }} />
      )}

      {/* Location permission dialog */}
      <LocationPermissionDialog
        open={showDialog}
        onAllow={handleAllow}
        onSelectCity={handleSelectCity}
      />
    </div>
  )
}
