const SOURCE_LOGOS = {
  district: '/logos/district-font-dark.png',
  bookmyshow: '/logos/bookmyshow.png',
}

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function formatPrice(priceMin, priceMax, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || '₹'
  if (!priceMin && !priceMax) return 'Free'
  if (priceMin === priceMax || !priceMax) return `${sym} ${priceMin?.toLocaleString('en-IN')}`
  return `${sym} ${priceMin?.toLocaleString('en-IN')}  –  ${sym} ${priceMax?.toLocaleString('en-IN')}`
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + '  ·  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/* ── District card: CSS-masked background with two-section layout ── */
const DISTRICT_MASK = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 453 146"><path d="M126 0H20C8.95 0 0 8.95 0 20v106c0 11.05 8.95 20 20 20h106c11.05 0 20-8.95 20-20V20c0-11.05-8.95-20-20-20z" fill="white"/><path d="M433 0H166c-11.05 0-20 8.95-20 20v106c0 11.05 8.95 20 20 20h267c11.05 0 20-8.95 20-20V20c0-11.05-8.95-20-20-20z" fill="white"/></svg>')}")`

function DistrictCard({ event, venue, price, date, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      className="relative w-full text-left cursor-pointer transition-all duration-200 focus-visible:outline-none"
      style={{ aspectRatio: '453 / 146' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Background image with two-section rounded mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          WebkitMaskImage: DISTRICT_MASK,
          maskImage: DISTRICT_MASK,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <img
          src="/logos/district-ticket-bg.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(12px)', transform: 'scale(1.08)' }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex w-full h-full">
        {/* Left section: event image */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '32.2%', padding: 12 }}>
          <div className="w-full h-full">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
                style={{ borderRadius: 8 }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/20" style={{ borderRadius: 8 }}>
                <span className="text-3xl">🎭</span>
              </div>
            )}
          </div>
        </div>

        {/* Right section: info + logo */}
        <div
          className="flex-1 flex items-center justify-between"
          style={{ padding: '12px 8px 12px 14px' }}
        >

        {/* Text column */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0 self-stretch justify-center overflow-hidden" style={{ gap: 10 }}>
          <h3 className="line-clamp-2" style={{ fontSize: 16, fontWeight: 600, color: 'white', lineHeight: 1.3 }}>
            {event.title}
          </h3>

          <div className="flex flex-col" style={{ gap: 4 }}>
            {venue?.name && (
              <div className="flex items-start" style={{ gap: 8 }}>
                <svg className="flex-shrink-0" style={{ width: 15, height: 15, marginTop: 1 }} fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-2" style={{ fontSize: 12, fontFamily: "'Cabin', sans-serif", color: 'white', lineHeight: 1.3 }}>
                  {venue.name}
                </span>
              </div>
            )}

            {date && (
              <div className="flex items-center" style={{ gap: 8 }}>
                <svg className="flex-shrink-0" style={{ width: 15, height: 15 }} fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: 12, fontFamily: "'Cabin', sans-serif", color: 'white' }}>
                  {date}
                </span>
              </div>
            )}

            <span style={{ fontSize: 16, fontFamily: "'Poppins', sans-serif", fontWeight: 900, color: 'white', marginTop: 2 }}>
              {price}
            </span>
          </div>
        </div>

        {/* District logo, rotated -90deg */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-center" style={{ width: 40, marginLeft: 2 }}>
          <img
            src="/logos/district-font-dark.png"
            alt="District"
            style={{
              width: 57,
              height: 'auto',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center center',
            }}
          />
        </div>
        </div>
      </div>
    </button>
  )
}

/* ── BookMyShow card: CSS-masked background with two-section layout ── */
const BMS_MASK = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 452 146"><path d="M126 0H20C8.95 0 0 8.95 0 20v106c0 11.05 8.95 20 20 20h106c11.05 0 20-8.95 20-20V20c0-11.05-8.95-20-20-20z" fill="white"/><path d="M432 0H165c-11.05 0-20 8.95-20 20v106c0 11.05 8.95 20 20 20h267c11.05 0 20-8.95 20-20V20c0-11.05-8.95-20-20-20z" fill="white"/></svg>')}")`

function BookMyShowCard({ event, venue, price, date, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      className="relative w-full text-left cursor-pointer transition-all duration-200 focus-visible:outline-none"
      style={{ aspectRatio: '452 / 146' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Background image with two-section rounded mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          WebkitMaskImage: BMS_MASK,
          maskImage: BMS_MASK,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <img
          src="/logos/bookmyshow-ticket-bg.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(12px)', transform: 'scale(1.08)' }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex w-full h-full">
        {/* Left section: event image */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '32.2%', padding: 12 }}>
          <div className="w-full h-full">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
                style={{ borderRadius: 8 }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/20" style={{ borderRadius: 8 }}>
                <span className="text-3xl">🎭</span>
              </div>
            )}
          </div>
        </div>

        {/* Right section: info + logo */}
        <div
          className="flex-1 flex items-center justify-between"
          style={{ padding: '12px 8px 12px 14px' }}
        >

        {/* Text column */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0 self-stretch justify-center overflow-hidden" style={{ gap: 10 }}>
          <h3 className="line-clamp-2" style={{ fontSize: 16, fontWeight: 600, color: 'white', lineHeight: 1.3, fontFamily: "'Helvetica Compressed', 'Arial Narrow', 'Roboto Condensed', sans-serif" }}>
            {event.title}
          </h3>

          <div className="flex flex-col" style={{ gap: 4 }}>
            {venue?.name && (
              <div className="flex items-start" style={{ gap: 8 }}>
                <svg className="flex-shrink-0" style={{ width: 15, height: 15, marginTop: 1 }} fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-2" style={{ fontSize: 12, fontFamily: "'Cabin', sans-serif", color: 'white', lineHeight: 1.3 }}>
                  {venue.name}
                </span>
              </div>
            )}

            {date && (
              <div className="flex items-center" style={{ gap: 8 }}>
                <svg className="flex-shrink-0" style={{ width: 15, height: 15 }} fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: 12, fontFamily: "'Cabin', sans-serif", color: 'white' }}>
                  {date}
                </span>
              </div>
            )}

            <span style={{ fontSize: 16, fontFamily: "'Poppins', sans-serif", fontWeight: 900, color: 'white', marginTop: 2 }}>
              {price}
            </span>
          </div>
        </div>

        {/* BookMyShow logo, rotated -90deg */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-center" style={{ width: 50, marginLeft: 2 }}>
          <img
            src="/logos/bookmyshow-font-light.svg"
            alt="BookMyShow"
            style={{
              width: 72,
              height: 'auto',
              transform: 'rotate(-90deg)',
              transformOrigin: 'center center',
            }}
          />
        </div>
        </div>
      </div>
    </button>
  )
}

export default function EventCard({ event, onClick, isSelected, onMouseEnter, onMouseLeave }) {
  const venue = event.venues
  const price = formatPrice(event.price_min, event.price_max, event.currency)
  const date = formatDate(event.start_time)
  const platform = event.source_platform?.toLowerCase()

  if (platform === 'district') {
    return (
      <DistrictCard
        event={event}
        venue={venue}
        price={price}
        date={date}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    )
  }

  if (platform === 'bookmyshow') {
    return (
      <BookMyShowCard
        event={event}
        venue={venue}
        price={price}
        date={date}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    )
  }

  return null
}
