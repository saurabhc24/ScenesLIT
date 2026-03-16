import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import EventPopup from './EventPopup'
import ClusterPanel from './ClusterPanel'

// Fix Leaflet default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LONG_PRESS_MS = 500
const LOCATION_THRESHOLD = 0.02 // ~2 km in degrees

function isValidCoord(v) {
  return typeof v === 'number' && isFinite(v)
}

function distanceDeg(a, b) {
  const dlat = a[0] - b[0]
  const dlng = a[1] - b[1]
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

/** 50×50 white square marker with event image */
function createEventIcon(imageUrl) {
  const img = imageUrl
    ? `<img src="${imageUrl}" style="width:46px;height:46px;object-fit:cover;border-radius:6px;margin:2px;display:block;" />`
    : `<div style="width:46px;height:46px;background:#fde8ea;border-radius:6px;margin:2px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎭</div>`

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

/** 64×64 highlighted marker shown when the corresponding sidebar card is hovered */
function createEventIconHovered(imageUrl) {
  const img = imageUrl
    ? `<img src="${imageUrl}" style="width:58px;height:58px;object-fit:cover;border-radius:8px;margin:3px;display:block;" />`
    : `<div style="width:58px;height:58px;background:#fde8ea;border-radius:8px;margin:3px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎭</div>`

  return L.divIcon({
    className: '',
    iconSize: [64, 64],
    iconAnchor: [32, 32],
    html: `
      <div style="
        width:64px;height:64px;background:#fff;border-radius:10px;
        box-shadow:0 4px 14px rgba(0,0,0,0.3);
        border:2px solid #D72638;
        display:flex;align-items:center;justify-content:center;
        box-sizing:border-box;overflow:hidden;
      ">${img}</div>
    `,
  })
}

/** Cluster icon: up to 9 cards in a stepped/overlapping grid + count pill.
 *  4 tiles → 2×2; 5 tiles → 3+2 with bottom row centred; else 3-col grid.
 *  Hover: each row lifts upward in sequence, bottom row first. */
function createClusterIcon(cluster) {
  const markers = cluster.getAllChildMarkers()
  const count = markers.length
  const thumbs = markers.slice(0, 9)

  const CARD = 34
  const STEP = 22
  const COLS = thumbs.length === 4 ? 2 : 3
  const COL_ARC = COLS === 2 ? [5, 5] : [7, 0, 7]
  const COL_ROT = COLS === 2 ? [-5, 5] : [-6, 0, 6]

  const rows = Math.ceil(thumbs.length / COLS)
  const gridW = (COLS - 1) * STEP + CARD
  const gridH = (rows - 1) * STEP + CARD + Math.max(...COL_ARC.slice(0, COLS))
  const maxRow = rows - 1

  const cards = thumbs
    .map((m, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      let x = col * STEP
      let y = row * STEP + COL_ARC[col]
      let rot = COL_ROT[col]

      // 5 tiles: centre-align the 2-tile bottom row
      if (thumbs.length === 5 && row === 1) {
        const posInRow = i - COLS
        const rowSpan = STEP + CARD
        const startX = (gridW - rowSpan) / 2
        x = startX + posInRow * STEP
        y = row * STEP + 4
        rot = posInRow === 0 ? -3 : 3
      }

      // Stagger delay: bottom row = 0ms, rows above get +70ms each
      const delayMs = (maxRow - row) * 70

      const url = m.options.eventImageUrl
      const inner = url
        ? `<img src="${url}" style="width:${CARD}px;height:${CARD}px;object-fit:cover;" />`
        : `<div style="width:${CARD}px;height:${CARD}px;background:#e0e7ff;"></div>`
      return `<div class="clst-card" style="
        position:absolute;left:${x}px;top:${y}px;z-index:${i + 1};
        width:${CARD}px;height:${CARD}px;border-radius:7px;
        border:2.5px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,0.22);
        overflow:hidden;transform-origin:center bottom;
        --r:${rot}deg;--delay:${delayMs}ms;
        transform:rotate(var(--r));
        transition:transform 0.22s ease var(--delay);
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
      <div class="clst-wrap" style="display:flex;flex-direction:column;align-items:center;gap:5px;">
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
        background:rgba(215,38,56,0.2);animation:sceneslit-pulse 2s infinite;
      "></div>
      <div style="
        width:12px;height:12px;border-radius:50%;
        background:#D72638;border:2.5px solid #fff;
        box-shadow:0 0 0 2px rgba(215,38,56,0.4);
        position:relative;z-index:1;
      "></div>
    </div>
  `,
})

/** Individual event marker */
const EventMarker = memo(function EventMarker({ event, onLongPress, isHovered, mode }) {
  const longPressTimer = useRef(null)
  const didLongPress = useRef(false)
  const venue = event.venues

  const icon = useMemo(
    () => isHovered ? createEventIconHovered(event.image_url) : createEventIcon(event.image_url),
    [isHovered, event.image_url]
  )

  if (!isValidCoord(venue?.latitude) || !isValidCoord(venue?.longitude)) return null

  // Desktop only: long-press detection (mousedown/mouseup)
  function startPress(e) {
    if (e.originalEvent) e.originalEvent.preventDefault()
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

  // Mobile: plain tap → EventPopup
  if (mode === 'mobile') {
    return (
      <Marker
        position={[venue.latitude, venue.longitude]}
        icon={icon}
        zIndexOffset={isHovered ? 500 : 0}
        eventId={event.id}
        eventImageUrl={event.image_url}
        eventHandlers={{ click: () => onLongPress(event) }}
      />
    )
  }

  // Desktop: click → EventPopup
  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={icon}
      zIndexOffset={isHovered ? 500 : 0}
      eventId={event.id}
      eventImageUrl={event.image_url}
      eventHandlers={{
        click: () => onLongPress(event),
        contextmenu: (e) => { if (e.originalEvent) e.originalEvent.preventDefault() },
      }}
    />
  )
})

/**
 * Desktop: centers on user location at zoom 12 (~10km radius) once location is available.
 * Mobile: fits bounds to show all events on first load.
 * Also renders the user location dot and "My location" button.
 */
function MapControls({ userLocation, showBtn, setShowBtn, onMapMove }) {
  const map = useMap()
  const initialFit = useRef(false)

  const validLoc = isValidCoord(userLocation?.lat) && isValidCoord(userLocation?.lng)

  useEffect(() => {
    if (!validLoc || initialFit.current) return
    initialFit.current = true
    map.setView([userLocation.lat, userLocation.lng], 12, { animate: true })
  }, [userLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvents({
    movestart() {
      if (onMapMove) onMapMove()
    },
    moveend() {
      const c = map.getCenter()
      if (validLoc) {
        setShowBtn(distanceDeg([c.lat, c.lng], [userLocation.lat, userLocation.lng]) > LOCATION_THRESHOLD)
      }
    },
  })

  return (
    <>
      {/* User location dot */}
      {validLoc && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={USER_LOCATION_ICON}
          zIndexOffset={1000}
          interactive={false}
        />
      )}

      {/* "My location" button — shown when map has panned away */}
      {showBtn && validLoc && (
        <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000, pointerEvents: 'auto' }}>
          <div className="leaflet-control m-4">
            <button
              onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.2 })}
              title="Go to my location"
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 text-xs font-semibold rounded-full shadow-md border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

/** Exposes flyToEvent on the mapRef */
function FlyToHelper({ mapRef }) {
  const map = useMap()
  useImperativeHandle(mapRef, () => ({
    flyToEvent(lat, lng) {
      if (isValidCoord(lat) && isValidCoord(lng)) {
        map.flyTo([lat, lng], 15, { duration: 1.2 })
      }
    },
  }), [map])
  return null
}

const MapView = forwardRef(function MapView({ events, userLocation, mode = 'desktop', hoveredEventId = null }, ref) {
  const [popupEvent, setPopupEvent] = useState(null)
  const [clusterEvents, setClusterEvents] = useState([])
  const [showLocationBtn, setShowLocationBtn] = useState(false)

  const handleLongPress = useCallback((event) => setPopupEvent(event), [])

  const handleClusterClick = useCallback((e) => {
    const childMarkers = e.layer.getAllChildMarkers()
    const ids = new Set(childMarkers.map(m => m.options.eventId))
    const clusterEvts = events.filter(ev => ids.has(ev.id))
    setClusterEvents(clusterEvts)
  }, [events])

  const handleMapMove = useCallback(() => {
    setClusterEvents([])
  }, [])

  const validEvents = useMemo(
    () => events.filter(e => isValidCoord(e.venues?.latitude) && isValidCoord(e.venues?.longitude)),
    [events]
  )

  const hasValidLocation = isValidCoord(userLocation?.lat) && isValidCoord(userLocation?.lng)
  const defaultCenter = hasValidLocation
    ? [userLocation.lat, userLocation.lng]
    : [18.9388, 72.8354]

  return (
    <div
      className="relative w-full h-full select-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: 'none' }}
    >
      <style>{`
        @keyframes sceneslit-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        .clst-wrap:hover .clst-card {
          transform: rotate(var(--r)) translateY(-7px);
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={mode === 'desktop' ? 12 : 13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <FlyToHelper mapRef={ref} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapControls
          userLocation={userLocation}
          showBtn={showLocationBtn}
          setShowBtn={setShowLocationBtn}
          onMapMove={handleMapMove}
        />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={60}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={false}
          removeOutsideVisibleBounds={false}
          eventHandlers={{ clusterclick: handleClusterClick }}
        >
          {validEvents.map((event) => (
            <EventMarker
              key={event.id}
              event={event}
              onLongPress={handleLongPress}
              isHovered={event.id === hoveredEventId}
              mode={mode}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Long-press / sidebar-click event detail popup */}
      {popupEvent && (
        <EventPopup event={popupEvent} onClose={() => setPopupEvent(null)} />
      )}

      {/* Cluster panel — slide in from right (desktop) or bottom (mobile) */}
      {clusterEvents.length > 0 && (
        <ClusterPanel
          events={clusterEvents}
          onClose={() => setClusterEvents([])}
          onEventClick={(event) => {
            setPopupEvent(event)
          }}
        />
      )}
    </div>
  )
})

export default MapView
