import EventCard from './EventCard'

export default function SidebarPanel({ events, eventsLoading, onEventClick, selectedEventId, onEventHover }) {
  return (
    <div className="flex flex-col h-full rounded-[20px] overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-5">
        {eventsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-full animate-pulse" style={{ aspectRatio: '453 / 146' }}>
              <div className="flex h-full gap-[10px]">
                {/* Left: image placeholder */}
                <div className="bg-gray-200 dark:bg-gray-700 rounded-[12px] flex-shrink-0" style={{ width: '32.2%' }} />
                {/* Right: content placeholder */}
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-[12px] flex flex-col justify-center px-4" style={{ gap: 10 }}>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-md" style={{ width: '75%' }} />
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-md" style={{ width: '55%' }} />
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-md" style={{ width: '45%' }} />
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-md" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-200">No events found</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-400">Try a different search or category</p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={event.id === selectedEventId}
              onClick={() => onEventClick(event)}
              onMouseEnter={() => onEventHover?.(event.id)}
              onMouseLeave={() => onEventHover?.(null)}
            />
          ))
        )}
      </div>
    </div>
  )
}
