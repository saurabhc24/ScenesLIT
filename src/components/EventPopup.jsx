import { useEffect } from 'react'
import { motion } from 'framer-motion'

const PRICE_COLORS = {
  district:   '#9D58E9',
  bookmyshow: '#FF2B2B',
  urbanaut:   '#065AB1',
  luma:       '#AE544A',
}

const CARD_BACKGROUNDS = {
  district:   '/logos/district-card-bg.svg',
  bookmyshow: '/logos/bms-card-bg.svg',
  urbanaut:   '/logos/urbanaut-card-bg.svg',
  luma:       '/logos/luma-card-bg.svg',
}

const FOOTER_LOGOS = {
  district:   '/logos/district-font-dark.png',
  bookmyshow: '/logos/bookmyshow-font-light.svg',
  urbanaut:   '/logos/urbanaut-logo-light.svg',
  luma:       '/logos/luma-font.svg',
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
  return `${sym} ${priceMin?.toLocaleString('en-IN')}  –  ${sym} ${priceMax?.toLocaleString('en-IN')}`
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

export default function EventPopup({ event, onClose }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!event) return null

  const venue = event.venues
  const price = formatPrice(event.price_min, event.price_max, event.currency)
  const date = formatDate(event.start_time)
  const platform = event.source_platform?.toLowerCase()
  const priceColor = PRICE_COLORS[platform] || '#111'
  const cardBg = CARD_BACKGROUNDS[platform]
  const footerLogo = FOOTER_LOGOS[platform]
  const isMobile = window.innerWidth < 768

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
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-event-title"
        className="relative bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        {...(isMobile ? {
          initial:    { y: '80vh', rotateY: -360, opacity: 0 },
          animate:    { y: 0,      rotateY: 0,    opacity: 1 },
          transition: {
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: 0.25, ease: 'easeIn' },
          },
          style: { transformPerspective: 900 },
        } : {})}
      >
        {/* Banner image */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : FALLBACK_BANNERS[platform] ? (
            <img
              src={FALLBACK_BANNERS[platform]}
              alt={event.title}
              className="w-full h-full object-cover"
              style={{ filter: 'blur(6px)', transform: 'scale(1.06)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-5xl">🎭</span>
            </div>
          )}

          {/* Close button — top left */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Get Tickets arrow — top right */}
          <button
            onClick={handleGetTickets}
            aria-label="Get Tickets"
            className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-lg hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M7 7h10v10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-4 pb-3 space-y-3" style={{ fontFamily: "'Lato', sans-serif" }}>
          <h2
            id="popup-event-title"
            className="text-gray-900 dark:text-white leading-snug"
            style={{ fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: 20 }}
          >
            {event.title}
          </h2>

          <div className="space-y-1.5">
            {venue?.name && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate" style={{ fontFamily: "'Lato', sans-serif" }}>
                  {venue.name}
                </span>
              </div>
            )}

            {date && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Lato', sans-serif" }}>
                  {date}
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: 28, color: priceColor, lineHeight: 1.1 }}>
            {price}
          </p>
        </div>

        {/* Vendor footer strip */}
        {cardBg && footerLogo && (
          <div
            className="w-full flex items-center justify-center"
            style={{
              height: 72,
              backgroundImage: `url('${cardBg}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <img
              src={footerLogo}
              alt={event.source_platform}
              style={{ height: 28, width: 'auto', objectFit: 'contain' }}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}
