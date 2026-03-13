import { useEffect } from 'react'

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function formatPrice(priceMin, priceMax, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || '₹'
  if (!priceMin && !priceMax) return 'Free'
  if (priceMin === priceMax || !priceMax) return `${sym} ${priceMin?.toLocaleString('en-IN')}`
  return `${sym} ${priceMin?.toLocaleString('en-IN')} – ${sym} ${priceMax?.toLocaleString('en-IN')}`
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return (
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
}

/**
 * Slide-in panel showing all events in a cluster.
 * Desktop: slides in from the right side of the map.
 * Mobile: slides up as a bottom sheet.
 * Dark mode applies on desktop only (md:dark:).
 */
export default function ClusterPanel({ events, onClose, onEventClick }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!events || events.length === 0) return null

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden absolute inset-0 z-[399] bg-black/40"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="
        cluster-panel absolute z-[400]
        bottom-0 left-0 right-0 max-h-[72vh]
        md:bottom-4 md:left-auto md:right-4 md:top-4 md:w-80 md:max-h-none
        rounded-t-2xl md:rounded-2xl
        bg-white md:dark:bg-gray-800
        shadow-2xl flex flex-col overflow-hidden
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 md:dark:border-gray-600 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900 md:dark:text-white">
              {events.length} Events here
            </h3>
            <p className="text-xs text-gray-400 md:dark:text-gray-400 mt-0.5">Tap an event for details</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 md:dark:bg-gray-700 text-gray-500 md:dark:text-gray-300 hover:bg-gray-200 md:dark:hover:bg-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-1">
          {events.map((event) => {
            const venue = event.venues
            const price = formatPrice(event.price_min, event.price_max, event.currency)
            const date = formatDate(event.start_datetime)
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 md:dark:hover:bg-gray-700 active:bg-gray-100 md:dark:active:bg-gray-600 transition text-left"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 md:dark:bg-gray-700">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎭</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 md:dark:text-white line-clamp-2 leading-snug">
                    {event.title}
                  </p>
                  {venue?.name && (
                    <p className="text-xs text-gray-500 md:dark:text-gray-300 mt-0.5 truncate">{venue.name}</p>
                  )}
                  {date && (
                    <p className="text-xs font-semibold text-gray-500 md:dark:text-gray-300 mt-0.5">{date}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-semibold text-primary">{price}</p>
                    {event.source_platform && (
                      <span className="text-[10px] font-semibold capitalize text-gray-400 md:dark:text-gray-400">
                        {event.source_platform}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-gray-300 md:dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
