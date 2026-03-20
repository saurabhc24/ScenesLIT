import { useEffect } from 'react'

const SOURCE_LOGOS = {
  district:   '/logos/district-font-dark.png',
  bookmyshow: '/logos/bookmyshow-font-light.svg',
  luma:       '/logos/luma-font.svg',
  urbanaut:   '/logos/urbanaut-logo-dark.svg',
}

const FALLBACK_BANNERS = {
  district:   '/logos/District-ticket-bg-mobile.png',
  bookmyshow: '/logos/Bookmyshow-ticket-bg-mobile.png',
  luma:       '/logos/Luma-ticket-bg-mobile.png',
  urbanaut:   '/logos/Urbanaut mobile background.png',
}

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
  const date = formatDate(event.start_time)

  function handleGetTickets() {
    if (!event.source_url) return
    try {
      const url = new URL(event.source_url)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        window.open(event.source_url, '_blank', 'noopener,noreferrer')
      }
    } catch { /* invalid URL — do nothing */ }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-event-title"
        className="relative bg-white md:dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Banner image */}
        <div className="w-full aspect-video bg-gray-100 overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : FALLBACK_BANNERS[event.source_platform?.toLowerCase()] ? (
            <img
              src={FALLBACK_BANNERS[event.source_platform.toLowerCase()]}
              alt={event.title}
              className="w-full h-full object-cover"
              style={{ filter: 'blur(6px)', transform: 'scale(1.06)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50">
              <span className="text-5xl">🎭</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          <h2 id="popup-event-title" className="text-base font-bold text-gray-900 md:dark:text-white leading-snug">{event.title}</h2>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 md:dark:text-gray-300 leading-relaxed line-clamp-4">
              {event.description}
            </p>
          )}

          <div className="space-y-1.5">
            {venue?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 md:dark:text-gray-300">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{venue.name}</span>
              </div>
            )}

            {date && (
              <div className="flex items-center gap-2 text-sm text-gray-600 md:dark:text-gray-300">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{date}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold text-primary">{price}</span>
            {event.source_platform && SOURCE_LOGOS[event.source_platform.toLowerCase()] && (
              <img
                src={SOURCE_LOGOS[event.source_platform.toLowerCase()]}
                alt={event.source_platform}
                className="h-5 w-auto object-contain"
                style={{ maxWidth: 80 }}
              />
            )}
          </div>

          <button
            onClick={handleGetTickets}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Get Tickets →
          </button>
        </div>
      </div>
    </div>
  )
}
