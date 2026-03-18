/**
 * Luma (lu.ma) — __NEXT_DATA__ scraper
 *
 * Step 1: Playwright loads the city discovery page, scrolls, collects event URLs
 * Step 2: Each event page is visited to extract __NEXT_DATA__ (Next.js SSR state)
 * Step 3: Venue coordinates from geo_latitude/geo_longitude or geo_address_info.lat_lng
 *         Falls back to city centre if Luma doesn't expose coordinates (e.g. online events skipped)
 */

import { chromium } from 'playwright'

const CITY_SLUG = {
  Mumbai:    'mumbai',
  Delhi:     'delhi',
  Bengaluru: 'bangalore',
  Hyderabad: 'hyderabad',
  Chennai:   'chennai',
  Pune:      'pune',
  Kolkata:   'kolkata',
  Goa:       'goa',
}

const CITY_CENTERS = {
  Mumbai:    { lat: 18.9388, lng: 72.8354 },
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Goa:       { lat: 15.2993, lng: 74.1240 },
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CONCURRENT_TABS = 4

// Extract __NEXT_DATA__ from a Luma event page
async function getNextData(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1500)
  try {
    return await page.$eval('#__NEXT_DATA__', el => JSON.parse(el.textContent))
  } catch {
    return null
  }
}

// Map __NEXT_DATA__ from a Luma event page to our DB shape
function mapNextData(nextData, city) {
  try {
    const props = nextData?.props?.pageProps
    // Luma page structure varies — try both common shapes
    const event = props?.event ?? props?.initialData?.event ?? props?.data?.event
    if (!event?.name) return null

    // Skip purely online events (no physical location)
    if (event.virtual_info?.has_virtual_info && !event.geo_latitude && !event.geo_address_info?.lat_lng) {
      return null
    }

    // Coordinates: direct fields first, then geo_address_info.lat_lng string
    let lat = event.geo_latitude ? parseFloat(event.geo_latitude) : null
    let lng = event.geo_longitude ? parseFloat(event.geo_longitude) : null

    if ((!lat || !lng) && event.geo_address_info?.lat_lng) {
      const [latStr, lngStr] = String(event.geo_address_info.lat_lng).split(',')
      lat = parseFloat(latStr)
      lng = parseFloat(lngStr)
    }

    // Fall back to city centre (same approach as BookMyShow)
    const center = CITY_CENTERS[city]
    if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && center) {
      lat = center.lat
      lng = center.lng
    }

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

    const geoInfo = event.geo_address_info
    const venueName = (
      geoInfo?.full_address?.split(',')[0]?.trim() ||
      event.geo_address_json?.address ||
      'Unknown Venue'
    )
    const venueAddress = geoInfo?.full_address || ''

    // Ticket pricing (Luma stores price in cents)
    const ticketInfo = event.ticket_info ?? props?.ticketInfo
    let priceMin = null
    let priceMax = null
    if (ticketInfo?.is_free === false) {
      priceMin = ticketInfo.min_ticket_price?.cents != null
        ? ticketInfo.min_ticket_price.cents / 100 : null
      priceMax = ticketInfo.max_ticket_price?.cents != null
        ? ticketInfo.max_ticket_price.cents / 100 : null
    }
    const currency = ticketInfo?.min_ticket_price?.currency?.toUpperCase() ?? 'INR'

    const slug = event.url || event.slug
    const eventUrl = slug ? `https://lu.ma/${slug}` : ''
    const externalId = `luma_${event.api_id ?? event.id ?? slug}`

    return {
      venue: {
        name: venueName,
        address: venueAddress,
        city,
        latitude: lat,
        longitude: lng,
      },
      event: {
        title: event.name,
        description: event.description?.trim() || null,
        category_name: 'Events',
        city,
        start_time: event.start_at ?? null,
        end_time: event.end_at ?? null,
        price_min: priceMin,
        price_max: priceMax,
        currency,
        source_platform: 'luma',
        source_url: eventUrl,
        image_url: event.cover_url ?? null,
        popularity_score: 0,
        external_id: externalId,
      },
    }
  } catch {
    return null
  }
}

export async function scrapeLuma(city) {
  const slug = CITY_SLUG[city]
  if (!slug) {
    console.warn(`[Luma] No city config for "${city}" — skipping`)
    return []
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })

    // Step 1: load city discovery page and collect event URLs
    const listPage = await context.newPage()
    await listPage.goto(`https://lu.ma/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await listPage.waitForTimeout(3000)

    // Scroll to trigger lazy-loaded cards
    for (let i = 0; i < 4; i++) {
      await listPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await listPage.waitForTimeout(1500)
    }

    // Collect event links — exclude known non-event paths
    const NON_EVENT = ['/discover', '/sign-in', '/pricing', '/blog', '/about', '/calendar', '/people']
    const eventUrls = await listPage.$$eval('a[href]', (els, nonEvent) => {
      const seen = new Set()
      return els.map(el => el.href).filter(href => {
        try {
          const url = new URL(href)
          if (url.hostname !== 'lu.ma') return false
          const path = url.pathname
          if (nonEvent.some(p => path.startsWith(p))) return false
          // Event slugs are a single path segment: /slug
          if (path.split('/').filter(Boolean).length !== 1) return false
          if (seen.has(href)) return false
          seen.add(href)
          return true
        } catch { return false }
      })
    }, NON_EVENT)
    await listPage.close()

    if (eventUrls.length === 0) return []

    // Step 2: visit each event page in batches, extract __NEXT_DATA__
    const results = []
    for (let i = 0; i < eventUrls.length; i += CONCURRENT_TABS) {
      const batch = eventUrls.slice(i, i + CONCURRENT_TABS)
      const pages = await Promise.all(batch.map(() => context.newPage()))

      const settled = await Promise.allSettled(
        pages.map((p, idx) => getNextData(p, batch[idx]))
      )

      await Promise.all(pages.map(p => p.close()))

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value) {
          const mapped = mapNextData(outcome.value, city)
          if (mapped) results.push(mapped)
        }
      }
    }

    return results
  } finally {
    await browser.close()
  }
}
