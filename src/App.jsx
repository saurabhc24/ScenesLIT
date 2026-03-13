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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Mobile header */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white shadow-sm flex-shrink-0 z-40">
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
        <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden gap-6 p-6">
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <SidebarPanel
            categories={categories}
            categoriesLoading={categoriesLoading}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            events={events}
            eventsLoading={eventsLoading}
            onEventClick={handleEventClick}
            selectedEventId={selectedEventId}
          />
        </div>
        <div className="flex-1 border border-gray-200 rounded-[20px] overflow-hidden">
          <MapView ref={mapRef} events={events} userLocation={userLocation} />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        <MapView ref={mapRef} events={events} userLocation={userLocation} />
      </div>

      {/* Event detail popup */}
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
