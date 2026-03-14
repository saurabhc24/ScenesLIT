const SOURCE_LOGOS = {
  district: '/logos/district.png',
  bookmyshow: '/logos/bookmyshow.png',
}

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function formatPrice(priceMin, priceMax, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || '₹'
  if (!priceMin && !priceMax) return 'Free'
  if (priceMin === priceMax || !priceMax) return `${sym}  ${priceMin?.toLocaleString('en-IN')}`
  return `${sym}  ${priceMin?.toLocaleString('en-IN')}  -  ${sym}  ${priceMax?.toLocaleString('en-IN')}`
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function EventCard({ event, onClick, isSelected, onMouseEnter, onMouseLeave }) {
  const venue = event.venues
  const price = formatPrice(event.price_min, event.price_max, event.currency)
  const date = formatDate(event.start_time)
  const logoSrc = SOURCE_LOGOS[event.source_platform?.toLowerCase()]

  return (
    <button
      type="button"
      className={`group flex flex-col w-full text-left bg-white rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/10 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Banner */}
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50">
            <span className="text-3xl">🎭</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">
          {event.title}
        </h3>

        {venue?.name && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venue.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date}</span>
          </div>
        )}

        <div className="flex items-end justify-between mt-1">
          <span className="text-base font-bold text-red-500">
            {price}
          </span>
          {logoSrc && (
            <img
              src={logoSrc}
              alt={event.source_platform}
              className="w-10 h-10 rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </button>
  )
}
