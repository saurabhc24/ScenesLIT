import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import EventPopup from './EventPopup'

// Fix Leaflet default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LONG_PRESS_MS = 500
const LOCATION_THRESHOLD = 0.02 // ~2 km in degrees

function distanceDeg(a, b) {
  const dlat = a[0] - b[0]
  const dlng = a[1] - b[1]
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

/** 50×50 white square, 8px border-radius, event image with 2px margin (46×46 image) */
function createEventIcon(imageUrl) {
  const img = imageUrl
    ? `<img src="${imageUrl}" style="width:46px;height:46px;object-fit:cover;border-radius:6px;margin:2px;display:block;" />`
    : `<div style="width:46px;height:46px;background:#e0e7ff;border-radius:6px;margin:2px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎭</div>`

  return L.divIcon({
    className: '',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    html: `
      <div style="
        width:50px;height:50px;background:#fff;border-radius:8px;
        box-shadow:0 2px 8px rgba(0,0,0,0.22);
        display:flex;align-items:center;justify-content:center;
        box-sizing:border-box;overflow:hidden;
      ">${img}</div>
    `,
  })
}

/** Cluster icon: up to 9 cards in a 3×3 stepped/overlapping grid + count pill */
function createClusterIcon(cluster) {
  const markers = cluster.getAllChildMarkers()
  const count = markers.length
  const thumbs = markers.slice(0, 9)

  const CARD = 34   // card size px
  const STEP = 22   // offset between cards (overlap = CARD - STEP = 12px)
  // Arc: outer cards in a row drop down, middle card stays at row baseline
  const COL_ARC = [7, 0, 7]     // extra Y drop (px) per column position
  const COL_ROT = [-6, 0, 6]    // rotation (deg) per column position

  const cols = Math.min(thumbs.length, 3)
  const rows = Math.ceil(thumbs.length / 3)
  const gridW = (cols - 1) * STEP + CARD
  const gridH = (rows - 1) * STEP + CARD + Math.max(...COL_ARC.slice(0, cols))

  const cards = thumbs
    .map((m, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = col * STEP
      const y = row * STEP + COL_ARC[col]
      const rot = COL_ROT[col]
      const url = m.options.eventImageUrl
      const inner = url
        ? `<img src="${url}" style="width:${CARD}px;height:${CARD}px;object-fit:cover;" />`
        : `<div style="width:${CARD}px;height:${CARD}px;background:#e0e7ff;"></div>`
      return `<div style="
        position:absolute;left:${x}px;top:${y}px;z-index:${i + 1};
        width:${CARD}px;height:${CARD}px;border-radius:7px;
        border:2.5px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,0.22);
        overflow:hidden;transform:rotate(${rot}deg);transform-origin:center bottom;
      ">${inner}</div>`
    })
    .join('')

  const iconW = Math.max(gridW, 72)
  const iconH = gridH + 5 + 22

  return L.divIcon({
    className: '',
    iconSize: [iconW, iconH],
    iconAnchor: [iconW / 2, iconH],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
        <div style="position:relative;width:${gridW}px;height:${gridH}px;">${cards}</div>
        <div style="background:#fff;color:#374151;font-size:11px;font-weight:600;
          padding:3px 10px;border-radius:999px;box-shadow:0 1px 5px rgba(0,0,0,0.15);
          white-space:nowrap;">${count} events</div>
      </div>
    `,
  })
}

/** Blue pulsing dot for the user's own location */
const USER_LOCATION_ICON = L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `
    <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;width:20px;height:20px;border-radius:50%;
        background:rgba(79,70,229,0.2);animation:sceneslit-pulse 2s infinite;
      "></div>
      <div style="
        width:12px;height:12px;border-radius:50%;
        background:#4f46e5;border:2.5px solid #fff;
        box-shadow:0 0 0 2px rgba(79,70,229,0.4);
        position:relative;z-index:1;
      "></div>
    </div>
  `,
})

/** Individual event marker with click and long-press */
function EventMarker({ event, onLongPress }) {
  const longPressTimer = useRef(null)
  const didLongPress = useRef(false)
  const venue = event.venues

  if (!isFinite(venue?.latitude) || !isFinite(venue?.longitude)) return null

  const icon = createEventIcon(event.image_url)

  function startPress() {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress(event)
    }, LONG_PRESS_MS)
  }

  function endPress() {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  function handleClick() {
    if (!didLongPress.current && event.source_url) {
      window.open(event.source_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={icon}
      eventImageUrl={event.image_url}
      eventHandlers={{
        mousedown: startPress,
        mouseup: endPress,
        touchstart: startPress,
        touchend: endPress,
        click: handleClick,
      }}
    />
  )
}

/**
 * Lives inside MapContainer:
 * - Flies to userLocation on first load
 * - Tracks moveend to show/hide the "My location" button
 * - Renders user location dot + optional "My location" button
 */
function MapControls({ userLocation, showBtn, setShowBtn }) {
  const map = useMap()
  const initialFlown = useRef(false)

  const validLoc = isFinite(userLocation?.lat) && isFinite(userLocation?.lng)
  if (validLoc && !initialFlown.current) {
    initialFlown.current = true
    map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.5 })
  }

  useMapEvents({
    moveend() {
      if (!userLocation) return
      const c = map.getCenter()
      const dist = distanceDeg(
        [c.lat, c.lng],
        [userLocation.lat, userLocation.lng]
      )
      setShowBtn(dist > LOCATION_THRESHOLD)
    },
  })

  return (
    <>
      {/* User location dot marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={USER_LOCATION_ICON}
          zIndexOffset={1000}
          interactive={false}
        />
      )}

      {/* "My location" button — shown when map has panned away */}
      {showBtn && userLocation && (
        <div
          className="leaflet-bottom leaflet-right"
          style={{ zIndex: 1000, pointerEvents: 'auto' }}
        >
          <div className="leaflet-control m-4">
            <button
              onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.2 })}
              title="Go to my location"
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 text-xs font-semibold rounded-full shadow-md border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="4" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              My location
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Inner component that exposes the map instance via imperative handle */
function FlyToHelper({ mapRef }) {
  const map = useMap()
  useImperativeHandle(mapRef, () => ({
    flyToEvent(lat, lng) {
      map.flyTo([lat, lng], 15, { duration: 1.2 })
    },
  }), [map])
  return null
}

const MapView = forwardRef(function MapView({ events, userLocation }, ref) {
  const [popupEvent, setPopupEvent] = useState(null)
  const [showLocationBtn, setShowLocationBtn] = useState(false)

  const handleLongPress = useCallback((event) => setPopupEvent(event), [])

  const hasValidLocation = isFinite(userLocation?.lat) && isFinite(userLocation?.lng)
  const defaultCenter = hasValidLocation
    ? [userLocation.lat, userLocation.lng]
    : [18.9388, 72.8354]

  return (
    <div className="relative w-full h-full">
      {/* Keyframe for user location pulse — injected once */}
      <style>{`
        @keyframes sceneslit-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <FlyToHelper mapRef={ref} />

        {/* Monochrome CartoDB Positron — parks light green, water light blue */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapControls
          userLocation={userLocation}
          showBtn={showLocationBtn}
          setShowBtn={setShowLocationBtn}
        />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={60}
          showCoverageOnHover={false}
        >
          {events
            .filter((e) => isFinite(e.venues?.latitude) && isFinite(e.venues?.longitude))
            .map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                onLongPress={handleLongPress}
              />
            ))}
        </MarkerClusterGroup>
      </MapContainer>

      {popupEvent && (
        <EventPopup event={popupEvent} onClose={() => setPopupEvent(null)} />
      )}
    </div>
  )
})

export default MapView
