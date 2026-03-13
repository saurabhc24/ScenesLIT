/**
 * Ticketmaster Discovery API — Official (free tier: 5000 calls/day)
 * Register at: https://developer.ticketmaster.com
 * Auth: apikey query param via TICKETMASTER_API_KEY env var
 *
 * Covers India events — especially international artists touring India,
 * large-scale festivals, and NH7 Weekender type events.
 */

const BASE = 'https://app.ticketmaster.com/discovery/v2'
const MAX_PAGES = 4 // 200 events/page → up to 800 events per city

export async function scrapeTicketmaster(city) {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    console.warn('[Ticketmaster] TICKETMASTER_API_KEY not set — skipping')
    return []
  }

  const results = []
  let page = 0
  let totalPages = 1
  const now = new Date().toISOString().replace('.000', '')
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('.000', '')

  while (page < totalPages && page < MAX_PAGES) {
    const params = new URLSearchParams({
      apikey: apiKey,
      countryCode: 'IN',
      city,
      startDateTime: now,
      endDateTime: in60Days,
      size: '200',
      page: String(page),
      sort: 'date,asc',
    })

    let data
    try {
      const res = await fetch(`${BASE}/events.json?${params}`)
      if (res.status === 429) {
        console.warn('[Ticketmaster] Rate limited — stopping')
        break
      }
      if (!res.ok) {
        console.error(`[Ticketmaster] HTTP ${res.status}`)
        break
      }
      data = await res.json()
    } catch (err) {
      console.error(`[Ticketmaster] Fetch failed: ${err.message}`)
      break
    }

    totalPages = data.page?.totalPages ?? 1
    const events = data._embedded?.events ?? []

    for (const ev of events) {
      const venue = ev._embedded?.venues?.[0]
      const lat = parseFloat(venue?.location?.latitude)
      const lng = parseFloat(venue?.location?.longitude)
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue

      const segment = ev.classifications?.[0]?.segment?.name || 'Events'
      const genre = ev.classifications?.[0]?.genre?.name
      const categoryName = genre && genre !== 'Undefined' ? genre : segment

      const prices = ev.priceRanges?.[0]
      const imageUrl =
        ev.images?.find((img) => img.ratio === '16_9' && img.width > 1000)
          ?.url ??
        ev.images?.[0]?.url ??
        null

      results.push({
        venue: {
          name: venue.name || 'Unknown Venue',
          address: [venue.address?.line1, venue.address?.city]
            .filter(Boolean)
            .join(', '),
          city,
          latitude: lat,
          longitude: lng,
        },
        event: {
          title: ev.name,
          description: ev.info || ev.pleaseNote || null,
          category_name: categoryName,
          city,
          start_time: ev.dates?.start?.dateTime ?? null,
          end_time: ev.dates?.end?.dateTime ?? null,
          price_min: prices?.min ?? null,
          price_max: prices?.max ?? null,
          currency: prices?.currency ?? 'INR',
          source_platform: 'ticketmaster',
          source_url: ev.url,
          image_url: imageUrl,
          popularity_score: 0,
          external_id: `ticketmaster_${ev.id}`,
        },
      })
    }

    page++
  }

  return results
}
