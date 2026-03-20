/**
 * Urbanaut (urbanaut.app) — Typesense API scraper
 *
 * Bypasses Playwright entirely. Queries the Typesense search API directly
 * using the public read-only key embedded in the Angular app.
 *
 * Key fields from the API:
 *   name, slug, price_starts_at, price_starts_at_currency,
 *   start (datetime string), lat, lng, venue, address,
 *   short_description_plain_text, medias (CDN images), categories
 */

const TYPESENSE_KEY = 'NSUWIvHiEDI8jvLN2GLhTfCzg3T6oYYV'
const TYPESENSE_BASE = 'https://search-v2.urbanaut.app/collections/spot_approved/documents/search'
const CDN_BASE = 'https://d10y46cwh6y6x1.cloudfront.net/'

// City IDs from /api/v5/city/
const CITY_ID = {
  Mumbai:    5,
  Delhi:     2,
  Bengaluru: 6,
  Goa:       10,
}

const PER_PAGE = 250

async function fetchPage(cityId, page, nowTs, futureTs) {
  const params = new URLSearchParams({
    q: '*',
    per_page: PER_PAGE,
    page,
    filter_by: `city:${cityId} && start_timestamp:>${nowTs} && start_timestamp:<${futureTs}`,
    sort_by: 'start_timestamp:asc',
  })
  const res = await fetch(`${TYPESENSE_BASE}?${params}`, {
    headers: {
      'x-typesense-api-key': TYPESENSE_KEY,
      'accept': 'application/json',
      'referer': 'https://urbanaut.app/',
      'clienttz': 'Asia/Kolkata',
    },
  })
  if (!res.ok) throw new Error(`Typesense HTTP ${res.status}`)
  return res.json()
}

function getImageUrl(medias) {
  if (!Array.isArray(medias) || medias.length === 0) return null
  // Prefer "Cover photo" type, fall back to first item
  const cover = medias.find(m => m.type === 'Cover photo') || medias[0]
  return cover?.path ? `${CDN_BASE}${cover.path}` : null
}

function parseStart(startStr) {
  if (!startStr) return null
  // Format: "2026-04-04 16:30:00" — treat as IST (UTC+5:30)
  try {
    const iso = startStr.replace(' ', 'T') + '+05:30'
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

function mapDoc(doc, city) {
  if (!doc.name || !doc.slug) return null

  const priceRaw = parseFloat(doc.price_starts_at)
  const priceMin = isNaN(priceRaw) ? null : priceRaw
  const currency  = doc.price_starts_at_currency || 'INR'

  return {
    venue: {
      name:      doc.venue     || doc.address || city,
      address:   doc.address   || doc.venue   || city,
      city,
      latitude:  parseFloat(doc.lat)  || null,
      longitude: parseFloat(doc.lng)  || null,
    },
    event: {
      title:            doc.name,
      description:      doc.short_description_plain_text?.trim() || null,
      category_name:    'Events',
      city,
      start_time:       parseStart(doc.upcoming_session || doc.start),
      end_time:         null,
      price_min:        priceMin,
      price_max:        priceMin,   // API only exposes starts_at
      currency,
      source_platform:  'urbanaut',
      source_url:       `https://urbanaut.app/spot/${doc.slug}`,
      image_url:        getImageUrl(doc.medias),
      popularity_score: doc.display_score ? Math.round(doc.display_score) : 0,
      external_id:      `urbanaut_${doc.slug}`,
    },
  }
}

export async function scrapeUrbanaut(city) {
  const cityId = CITY_ID[city]
  if (!cityId) return [] // city not covered by Urbanaut

  const nowTs    = Math.floor(Date.now() / 1000)
  const futureTs = nowTs + 60 * 24 * 60 * 60 // 60 days ahead

  // First page to get total count
  const first = await fetchPage(cityId, 1, nowTs, futureTs)
  const total = first.found ?? 0
  const pages = Math.ceil(total / PER_PAGE)

  const docs = [...(first.hits || []).map(h => h.document)]

  // Fetch remaining pages if any
  for (let p = 2; p <= pages; p++) {
    const data = await fetchPage(cityId, p, nowTs, futureTs)
    docs.push(...(data.hits || []).map(h => h.document))
  }

  return docs.map(d => mapDoc(d, city)).filter(Boolean)
}
