import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'

const PRICE_COLORS = {
  district:   '#9D58E9',
  bookmyshow: '#FF2B2B',
  urbanaut:   '#065AB1',
  luma:       '#AE544A',
}

const VENDOR_BGS = {
  district:   '/logos/District-ticket-bg-mobile.png',
  bookmyshow: '/logos/Bookmyshow-ticket-bg-mobile.png',
  luma:       '/logos/Luma-ticket-bg-mobile.png',
  urbanaut:   '/logos/Urbanaut mobile background.png',
}

const VENDOR_LOGOS = {
  district:   '/logos/district-font-light.svg',
  bookmyshow: '/logos/bookmyshow-font-light.svg',
  urbanaut:   '/logos/urbanaut-logo-light.svg',
  luma:       '/logos/luma-font.svg',
}

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function parseDate(timestamp) {
  if (!timestamp) return null
  const d = new Date(timestamp)
  const month = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return { month, day, time: `${hour12}:${minutes}`, ampm }
}

function formatStartingPrice(priceMin, priceMax, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || '₹'
  if (!priceMin && !priceMax) return { label: 'Free', price: null }
  const val = priceMin ?? priceMax
  return { label: 'Starting', price: `${sym} ${val.toLocaleString('en-IN')}` }
}

function shortName(name) {
  if (!name) return ''
  return name.split(',')[0].trim()
}

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(t)
  }, [map])
  return null
}

function VenueMap({ lat, lng }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <InvalidateSize />
    </MapContainer>
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
  const platform = event.source_platform?.toLowerCase()
  const priceColor = PRICE_COLORS[platform] || '#111'
  const vendorBg = VENDOR_BGS[platform]
  const vendorLogo = VENDOR_LOGOS[platform]
  const isMobile = window.innerWidth < 768
  const dateInfo = parseDate(event.start_time)
  const { label: priceLabel, price: priceValue } = formatStartingPrice(event.price_min, event.price_max, event.currency)
  const hasCoords = venue?.latitude != null && venue?.longitude != null
  const venueName = shortName(venue?.name)

  function openEvent() {
    if (!event.source_url) return
    try {
      const url = new URL(event.source_url)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        window.open(event.source_url, '_blank', 'noopener,noreferrer')
      }
    } catch { /* invalid URL */ }
  }

  // Responsive sizes
  const bannerH   = isMobile ? 200 : 284
  const titleSize = isMobile ? 22 : 32
  const monthSize = isMobile ? 24 : 24
  const daySize   = isMobile ? 48 : 48
  const timeSize  = isMobile ? 24 : 24
  const ampmSize  = isMobile ? 11 : 12
  const mapH      = isMobile ? 100 : 140
  const innerGap  = isMobile ? 12 : 16
  const priceSize = isMobile ? 20 : 24

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
        className="relative w-full shadow-2xl cursor-pointer"
        style={{ maxWidth: isMobile ? 384 : 440, borderRadius: 20, overflow: 'hidden' }}
        onClick={(e) => { e.stopPropagation(); openEvent() }}
        {...(isMobile ? {
          initial:    { y: '80vh', opacity: 0 },
          animate:    { y: 0,      opacity: 1 },
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        } : {})}
      >

        {/* ── Banner image — sits behind everything ── */}
        <div style={{ height: bannerH, padding: 20, position: 'relative', zIndex: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 48 }}>🎭</span>
              </div>
            )}
          </div>

          {/* Arrow indicator — top right */}
          <div
            style={{ position: 'relative', zIndex: 10, width: 48, height: 48, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}
          >
            <svg width="20" height="20" fill="none" stroke="#111" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M7 7h10v10" />
            </svg>
          </div>
        </div>

        {/* ── Vendor info section — overlaps and sits above banner ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            marginTop: -40,
            overflow: 'hidden',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? 10 : 14,
            paddingTop: isMobile ? 16 : 20,
            paddingBottom: isMobile ? 16 : 22,
            paddingLeft: 10,
            paddingRight: 10,
            boxShadow: `0px 8px 7px -2px ${priceColor} inset`,
          }}
        >
          {/* Rotated vendor background */}
          {vendorBg && (
            <img
              src={vendorBg}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '160%',
                height: '160%',
                objectFit: 'cover',
                transform: isMobile
                  ? 'translate(-50%, -50%) rotate(90deg)'
                  : 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Vendor logo */}
          {vendorLogo && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <img src={vendorLogo} alt={event.source_platform} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            </div>
          )}

          {/* White inner card */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              alignSelf: 'stretch',
              background: 'white',
              borderRadius: 24,
              padding: isMobile ? '12px 12px' : '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: innerGap,
              overflow: 'hidden',
            }}
          >
            {/* Title */}
            <h2
              id="popup-event-title"
              style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: titleSize, color: 'black', lineHeight: 1.15, margin: 0 }}
            >
              {event.title}
            </h2>

            {/* Date + Map row */}
            <div style={{ display: 'flex', gap: innerGap, alignItems: 'flex-start' }}>

              {/* Left: date */}
              {dateInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: monthSize, color: priceColor, lineHeight: 1 }}>
                    {dateInfo.month}
                  </div>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: daySize, color: priceColor, lineHeight: 1 }}>
                    {dateInfo.day}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: timeSize, color: priceColor }}>
                      {dateInfo.time}
                    </span>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: ampmSize, color: priceColor }}>
                      {dateInfo.ampm}
                    </span>
                  </div>
                </div>
              )}

              {/* Right: map tile with superimposed venue name */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ position: 'relative', width: '100%', height: mapH, borderRadius: 8, overflow: 'hidden' }}>
                  {hasCoords ? (
                    <VenueMap lat={venue.latitude} lng={venue.longitude} />
                  ) : event.image_url ? (
                    <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 28 }}>📍</span>
                    </div>
                  )}

                  {/* Venue name overlaid on map */}
                  {venueName && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 800,
                          fontSize: isMobile ? 14 : 16,
                          color: 'black',
                          textAlign: 'center',
                          padding: '4px 8px',
                          textShadow: '0 0 6px white, 0 0 12px white, 0 0 20px white',
                        }}
                      >
                        {venueName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: priceSize, color: 'white' }}>
              {priceLabel}
            </span>
            {priceValue && (
              <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 800, fontSize: priceSize, color: 'white' }}>
                {priceValue}
              </span>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  )
}
