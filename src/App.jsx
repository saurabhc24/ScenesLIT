import { useState, useRef, useCallback } from 'react'
import Navbar from './components/Navbar'
import SidebarPanel from './components/SidebarPanel'
import MapView from './components/MapView'
import EventPopup from './components/EventPopup'
import LocationPermissionDialog from './components/LocationPermissionDialog'
import { useEvents } from './hooks/useEvents'
import { useCategories } from './hooks/useCategories'
import { useGeolocation } from './hooks/useGeolocation'

export default function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
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
  const { categories, loading: categoriesLoading } = useCategories()
  const { events, loading: eventsLoading } = useEvents({ searchTerm, categoryId: selectedCategory })

  const handleEventClick = useCallback((event) => {
    setSelectedEventId(event.id)
    setSelectedEvent(event)
    const venue = event.venues
    if (venue?.latitude != null && venue?.longitude != null) {
      mapRef.current?.flyToEvent(venue.latitude, venue.longitude)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* Mobile header */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0 z-40">
        <div className="flex items-center gap-1 select-none flex-shrink-0">
          <span className="text-lg font-black tracking-tight text-gray-900">Scenes</span>
          <span className="text-lg font-black tracking-tight text-indigo-600">LIT</span>
        </div>
        <div className="flex-1 min-w-0 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
          />
        </div>
      </header>

      {/* Desktop header */}
      <div className="hidden md:block">
        <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} darkMode={darkMode} onToggleDark={toggleDark} />
      </div>

      {/* Category bar — desktop and mobile */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 md:px-6 py-2.5 bg-white md:dark:bg-gray-900 border-b border-gray-100 md:dark:border-gray-800 overflow-x-auto no-scrollbar z-30">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === null
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 md:dark:bg-gray-800 text-gray-600 md:dark:text-gray-300 hover:bg-gray-200 md:dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {categoriesLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 h-7 w-20 rounded-full bg-gray-100 md:dark:bg-gray-700 animate-pulse" />
          ))
        ) : (
          categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 md:dark:bg-gray-800 text-gray-600 md:dark:text-gray-300 hover:bg-gray-200 md:dark:hover:bg-gray-700'
              }`}
            >
              {cat.icon && <span className="text-sm">{cat.icon}</span>}
              {cat.name}
            </button>
          ))
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden gap-6 p-6">
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <SidebarPanel
            events={events}
            eventsLoading={eventsLoading}
            onEventClick={handleEventClick}
            selectedEventId={selectedEventId}
          />
        </div>
        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-[20px] overflow-hidden">
          <MapView ref={mapRef} events={events} userLocation={userLocation} mode="desktop" />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        <MapView ref={mapRef} events={events} userLocation={userLocation} mode="mobile" />
      </div>

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
