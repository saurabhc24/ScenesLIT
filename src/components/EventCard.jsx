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
      className={`group flex flex-col w-full text-left bg-white overflow-hidden cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
      style={{ padding: 16, borderRadius: 24, gap: 20 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Event image — fill width, 8px radius */}
      <div className="w-full overflow-hidden" style={{ borderRadius: 8, height: 193 }}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50">
            <span className="text-3xl">🎭</span>
          </div>
        )}
      </div>

      {/* Title — fill width */}
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#000', wordWrap: 'break-word', lineHeight: 1.3 }}>
        {event.title}
      </h3>

      {/* Bottom section: info left, logo right */}
      <div className="w-full flex justify-between items-start">
        {/* Left: venue, date, price */}
        <div className="flex-1 flex flex-col" style={{ gap: 12 }}>
          {venue?.name && (
            <div className="flex items-center" style={{ gap: 8 }}>
              <svg className="flex-shrink-0" style={{ width: 18, height: 18, color: '#757575' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#757575' }} className="truncate">{venue.name}</span>
            </div>
          )}

          {date && (
            <div className="flex items-center" style={{ gap: 8 }}>
              <svg className="flex-shrink-0" style={{ width: 18, height: 18, color: '#757575' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#757575' }}>{date}</span>
            </div>
          )}

          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#FF2B2B' }}>{price}</span>
          </div>
        </div>

        {/* Right: vendor logo aligned to bottom */}
        {logoSrc && (
          <div className="flex flex-col justify-end self-stretch">
            <img
              src={logoSrc}
              alt={event.source_platform}
              style={{ width: 86, height: 86, borderRadius: 8 }}
              className="object-contain"
            />
          </div>
        )}
      </div>
    </button>
  )
}
