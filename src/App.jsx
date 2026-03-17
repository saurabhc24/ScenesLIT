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
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [hoveredEventId, setHoveredEventId] = useState(null)
  const mapRef = useRef(null)

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

  const { location: userLocation, showDialog, handleAllow, handleSelectCity } = useGeolocation()
  const { events, loading: eventsLoading } = useEvents({ searchTerm, categoryId: null, lat: userLocation?.lat ?? null, lng: userLocation?.lng ?? null })

  // Pan/fit map to search results whenever they change
  useEffect(() => {
    if (eventsLoading || !searchTerm.trim()) return
    mapRef.current?.fitEvents(events)
  }, [events]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventClick = useCallback((event) => {
    setSelectedEventId(event.id)
    setSelectedEvent(event)
    const venue = event.venues
    if (venue?.latitude != null && venue?.longitude != null) {
      mapRef.current?.flyToEvent(venue.latitude, venue.longitude)
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
          <MapView ref={mapRef} events={events} userLocation={userLocation} mode="desktop" hoveredEventId={hoveredEventId} />
        </div>
      </div>

      {/* Mobile layout — 16px padding, 8px gaps */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden bg-white pt-4 px-4 gap-2">
        {/* Mobile header: Logo + Search */}
        <header className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-0.5 px-3 py-2 select-none flex-shrink-0">
            <span className="text-sm font-black tracking-tight text-gray-900">Scenes</span>
            <span className="text-sm font-black tracking-tight text-primary">LIT</span>
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
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </header>

        {/* Map — fills remaining space, rounded corners, subtle border */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ border: '0.5px solid #C8C8C8' }}>
          <MapView ref={mapRef} events={events} userLocation={userLocation} mode="mobile" />
        </div>
      </div>

      {/* Footer */}
      <footer
        className="flex-shrink-0 flex items-center justify-center py-2.5"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0.625rem))' }}
      >
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '16px', color: '#111' }}>
          A passion project by{' '}
          <a
            href="https://saurabhchandra.framer.website/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Lobster', cursive", fontSize: '16px', color: '#111', textDecoration: 'none' }}
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
