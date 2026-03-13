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
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function EventPopup({ event, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!event) return null

  const venue = event.venues
  const price = formatPrice(event.price_min, event.price_max, event.currency)
  const date = formatDate(event.start_datetime)

  function handleGetTickets() {
    if (event.source_url) {
      window.open(event.source_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Banner image */}
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
              <span className="text-5xl">🎭</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{event.title}</h2>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-4">
              {event.description}
            </p>
          )}

          <div className="space-y-1.5">
            {venue?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{venue.name}</span>
              </div>
            )}

            {date && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{date}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold text-indigo-600">{price}</span>
            {event.source_platform && (
              <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{event.source_platform}</span>
            )}
          </div>

          <button
            onClick={handleGetTickets}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Get Tickets →
          </button>
        </div>
      </div>
    </div>
  )
}
