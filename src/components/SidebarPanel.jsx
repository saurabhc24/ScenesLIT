import EventCard from './EventCard'

export default function SidebarPanel({ events, eventsLoading, onEventClick, selectedEventId, onEventHover }) {
  return (
    <div className="flex flex-col h-full rounded-[20px] overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-5">
        {eventsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600">
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/3" />
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
