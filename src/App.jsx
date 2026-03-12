import { useState } from 'react'
import Navbar from './components/Navbar'
import SidebarPanel from './components/SidebarPanel'
import MapView from './components/MapView'
import EventPopup from './components/EventPopup'
import { useEvents } from './hooks/useEvents'
import { useCategories } from './hooks/useCategories'
import { useGeolocation } from './hooks/useGeolocation'

export default function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const { location: userLocation } = useGeolocation()
  const { categories, loading: categoriesLoading } = useCategories()
  const { events, loading: eventsLoading } = useEvents({ searchTerm, categoryId: selectedCategory })

  function handleEventClick(event) {
    setSelectedEvent(event)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Navbar — shared across both breakpoints */}
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Desktop layout (md and up) */}
      <div className="hidden md:flex flex-1 overflow-hidden gap-6 p-6">
        {/* Left: Sidebar panel (categories + event cards) */}
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <SidebarPanel
            categories={categories}
            categoriesLoading={categoriesLoading}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            events={events}
            eventsLoading={eventsLoading}
            onEventClick={handleEventClick}
          />
        </div>

        {/* Right: Map panel */}
        <div className="flex-1 border border-gray-200 rounded-[20px] overflow-hidden">
          <MapView events={events} userLocation={userLocation} />
        </div>
      </div>

      {/* Mobile layout (below md) */}
      <div className="flex md:hidden flex-1 overflow-hidden">
        <MapView events={events} userLocation={userLocation} />
      </div>

      {/* Event detail popup (desktop card click) */}
      {selectedEvent && (
        <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
