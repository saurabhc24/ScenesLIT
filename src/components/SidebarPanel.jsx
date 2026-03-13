import EventCard from './EventCard'

export default function SidebarPanel({
  categories,
  categoriesLoading,
  selectedCategory,
  onCategoryChange,
  events,
  eventsLoading,
  onEventClick,
  selectedEventId,
}) {
  return (
    <div className="flex flex-col h-full border border-gray-200 dark:border-gray-700 rounded-[20px] overflow-hidden bg-white dark:bg-gray-800">
      {/* Category filter pills */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Categories</p>
        <div className="flex flex-wrap gap-2">
          {/* All pill */}
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === null
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>

          {categoriesLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                {cat.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Event cards — scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
        {eventsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm font-medium dark:text-gray-400">No events found</p>
            <p className="text-xs mt-1 dark:text-gray-500">Try a different search or category</p>
            {selectedCategory && (
              <button
                onClick={() => onCategoryChange(null)}
                className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Show all events
              </button>
            )}
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={event.id === selectedEventId}
              onClick={() => onEventClick(event)}
            />
          ))
        )}
      </div>
    </div>
  )
}
