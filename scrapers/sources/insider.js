/**
 * Insider.in / District by Zomato — Unofficial JSON API
 *
 * ⚠️  FINDING THE CORRECT ENDPOINT:
 * Since Insider.in rebranded to District by Zomato, the API URL may have changed.
 * To find the current endpoint:
 *   1. Open https://insider.in in Chrome
 *   2. Open DevTools → Network tab → filter by "Fetch/XHR"
 *   3. Click on an event listing page (e.g. "Mumbai" tab)
 *   4. Look for API calls returning JSON arrays of events
 *   5. Copy that URL and update BASE + LISTING_PATH below
 *
 * Known historical endpoint (may still work):
 *   https://api.insider.in/api/v1/event?city=mumbai&page=0&per_page=40&type=upcoming
 */

const BASE = 'https://api.insider.in'
const LISTING_PATH = '/api/v1/event'

const CITY_SLUGS = {
  Mumbai: 'mumbai',
  Delhi: 'delhi-ncr',
  Bengaluru: 'bengaluru',
  Hyderabad: 'hyderabad',
  Chennai: 'chennai',
  Pune: 'pune',
  Kolkata: 'kolkata',
  Ahmedabad: 'ahmedabad',
  Goa: 'goa',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
  Referer: 'https://insider.in/',
}

const MAX_PAGES = 5

export async function scrapeInsider(city) {
  const citySlug = CITY_SLUGS[city]
  if (!citySlug) {
    console.warn(`[Insider] No city slug for "${city}" — skipping`)
    return []
  }

  const results = []
  let page = 0
  let hasMore = true

  while (hasMore && page < MAX_PAGES) {
    const params = new URLSearchParams({
      city: citySlug,
      page: String(page),
      per_page: '40',
      type: 'upcoming',
    })

    let data
    try {
      const res = await fetch(`${BASE}${LISTING_PATH}?${params}`, {
        headers: HEADERS,
      })
      if (!res.ok) {
        if (page === 0) {
          console.warn(
            `[Insider] HTTP ${res.status} — endpoint may have changed. ` +
              `See instructions at top of insider.js to find the current URL.`
          )
        }
        break
      }
      data = await res.json()
    } catch (err) {
      if (page === 0) {
        console.warn(
          `[Insider] Connection failed (${err.message}) — ` +
            `endpoint may have changed since District rebrand.`
        )
      }
      break
    }

    // API may return { data: [...] } or { events: [...] } or a bare array
    const events = Array.isArray(data)
      ? data
      : (data.data ?? data.events ?? [])

    if (events.length === 0) break

    for (const ev of events) {
      const venue = ev.venue ?? ev.venues?.[0] ?? null
      const lat = venue?.geo?.lat ?? venue?.latitude
      const lng = venue?.geo?.lng ?? venue?.longitude ?? venue?.lon
      if (!lat || !lng) continue

      const slug = ev.slug || ev._id || ev.id
      const categoryName =
        ev.tags?.[0]?.name ?? ev.category?.name ?? ev.type ?? 'Events'

      results.push({
        venue: {
          name: venue.name || 'Unknown Venue',
          address: venue.address || venue.location || '',
          city,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        },
        event: {
          title: ev.name || ev.title || 'Untitled',
          description: ev.description || null,
          category_name: categoryName,
          city,
          start_time: ev.start_utc ?? ev.start_time ?? ev.startTime ?? null,
          end_time: ev.end_utc ?? ev.end_time ?? ev.endTime ?? null,
          price_min: ev.min_price ?? ev.price_min ?? null,
          price_max: ev.max_price ?? ev.price_max ?? null,
          currency: 'INR',
          source_platform: 'insider',
          source_url: slug ? `https://insider.in/${slug}` : 'https://insider.in',
          image_url:
            ev.horizontal_cover_image ??
            ev.cover_image ??
            ev.image ??
            ev.thumbnail ??
            null,
          popularity_score: ev.popularity_score ?? 0,
          external_id: `insider_${ev._id ?? ev.id ?? slug}`,
        },
      })
    }

    hasMore = events.length === 40
    page++
  }

  return results
}
