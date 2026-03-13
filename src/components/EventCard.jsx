const SOURCE_COLORS = {
  district: 'bg-orange-100 text-orange-700',
  bookmyshow: 'bg-red-100 text-red-700',
  insider: 'bg-purple-100 text-purple-700',
  paytm: 'bg-blue-100 text-blue-700',
  default: 'bg-gray-100 text-gray-600',
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function SourceBadge({ platform }) {
  const key = platform?.toLowerCase() || 'default'
  const colorClass = SOURCE_COLORS[key] || SOURCE_COLORS.default
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorClass} capitalize`}>
      {platform || 'Unknown'}
    </span>
  )
}

export default function EventCard({ event, onClick, isSelected }) {
  const venue = event.venues
  const price = formatPrice(event.price_min, event.price_max, event.currency)
  const date = formatDate(event.start_datetime)

  return (
    <div
      className={`group flex flex-col bg-white dark:bg-gray-800 rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      {/* Banner */}
      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
            <span className="text-3xl">🎭</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <SourceBadge platform={event.source_platform} />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
          {event.title}
        </h3>

        {venue?.name && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venue.name}</span>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date}</span>
          </div>
        )}

        <div className="mt-1 text-sm font-semibold text-indigo-600">
          {price}
        </div>
      </div>
    </div>
  )
}
