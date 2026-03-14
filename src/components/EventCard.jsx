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
      className={`group flex flex-col w-full text-left bg-white rounded-3xl p-4 gap-5 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isSelected
          ? 'shadow-md ring-2 ring-primary/10'
          : ''
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Banner */}
      <div className="w-full h-[193px] overflow-hidden rounded-lg bg-gray-100">
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

      {/* Title — full width */}
      <h3 className="text-xl font-bold text-black leading-snug line-clamp-2 w-full">
        {event.title}
      </h3>

      {/* Details row: info left, logo bottom-right */}
      <div className="flex justify-between w-full">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {venue?.name && (
            <div className="flex items-center gap-2 text-[#757575]">
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium truncate">{venue.name}</span>
            </div>
          )}

          {date && (
            <div className="flex items-center gap-2 text-[#757575]">
              <svg className="w-[19px] h-[19px] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">{date}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#FF2B2B]">
              {price}
            </span>
          </div>
        </div>

        {/* Right column — logo pinned to bottom */}
        {logoSrc && (
          <div className="flex flex-col justify-end">
            <img
              src={logoSrc}
              alt={event.source_platform}
              className="w-[86px] h-[86px] rounded-lg object-contain"
            />
          </div>
        )}
      </div>
    </button>
  )
}
