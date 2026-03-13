/**
 * Eventbrite — Official API (free tier)
 * Docs: https://www.eventbrite.com/platform/api
 * Auth: Bearer token via EVENTBRITE_API_KEY env var
 */

const BASE = 'https://www.eventbriteapi.com/v3'
const MAX_PAGES = 5 // 50 events/page → up to 250 events per city

export async function scrapeEventbrite(city) {
  const apiKey = process.env.EVENTBRITE_API_KEY
  if (!apiKey) {
    console.warn('[Eventbrite] EVENTBRITE_API_KEY not set — skipping')
    return []
  }

  const results = []
  let page = 1
  let hasMore = true
  const now = new Date().toISOString()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  while (hasMore && page <= MAX_PAGES) {
    const params = new URLSearchParams({
      'location.address': `${city}, India`,
      'location.within': '50km',
      'start_date.range_start': now,
      'start_date.range_end': in30Days,
      'expand': 'venue,ticket_availability,category',
      'page_size': '50',
      'page': String(page),
      'sort_by': 'date',
    })

    const res = await fetch(`${BASE}/events/search/?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[Eventbrite] HTTP ${res.status}: ${body.slice(0, 200)}`)
      break
    }

    const data = await res.json()

    for (const ev of data.events || []) {
      const venue = ev.venue
      if (!venue?.latitude || !venue?.longitude) continue

      const priceMin = ev.is_free
        ? 0
        : ev.ticket_availability?.minimum_ticket_price?.value ?? null
      const priceMax = ev.is_free
        ? 0
        : ev.ticket_availability?.maximum_ticket_price?.value ?? null

      results.push({
        venue: {
          name: venue.name || 'Unknown Venue',
          address: venue.address?.localized_address_display || '',
          city,
          latitude: parseFloat(venue.latitude),
          longitude: parseFloat(venue.longitude),
        },
        event: {
          title: ev.name?.text || 'Untitled',
          description: ev.description?.text || null,
          category_name: ev.category?.name || 'Events',
          city,
          start_time: ev.start?.utc || null,
          end_time: ev.end?.utc || null,
          price_min: priceMin,
          price_max: priceMax,
          currency: ev.currency || 'INR',
          source_platform: 'eventbrite',
          source_url: ev.url,
          image_url: ev.logo?.url || null,
          popularity_score: 0,
          external_id: `eventbrite_${ev.id}`,
        },
      })
    }

    hasMore = data.pagination?.has_more_items === true
    page++
  }

  return results
}
