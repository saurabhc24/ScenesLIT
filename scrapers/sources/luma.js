/**
 * Luma (luma.com, formerly lu.ma) — __NEXT_DATA__ scraper
 *
 * Step 1: Playwright loads the city page (lu.ma/<city> redirects to luma.com/<city>),
 *         scrolls, and collects event slug URLs matching the 6–12 char alphanumeric pattern
 * Step 2: Each event page is visited to extract __NEXT_DATA__.props.pageProps.initialData.data
 * Step 3: Venue city is known from the city page; lat/lng falls back to city centre
 *         (Luma event pages expose city/address text but not lat/lng coordinates)
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

// Known non-event single-segment paths on luma.com
const EXCLUDED_SLUGS = new Set([
  'discover', 'signin', 'login', 'signup', 'pricing', 'about',
  'blog', 'create', 'ios', 'android', 'map', 'people', 'calendar',
  'help', 'terms', 'privacy', 'jobs', 'press',
])

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
// Correct path: props.pageProps.initialData.data
function mapNextData(nextData, city) {
  try {
    const data = nextData?.props?.pageProps?.initialData?.data
    if (!data || !data.event?.name) return null

    const event = data.event

    // Use city centre for coordinates (Luma doesn't expose lat/lng in page data)
    const center = CITY_CENTERS[city]
    if (!center) return null

    const geoInfo = event.geo_address_info
    const venueName = (
      geoInfo?.address?.split(',')[0]?.trim() ||
      geoInfo?.city ||
      'Unknown Venue'
    )
    const venueAddress = [geoInfo?.address, geoInfo?.region, geoInfo?.country]
      .filter(Boolean).join(', ')

    // Ticket pricing — format: { price, is_free, max_price, currency_info }
    const ticketInfo = data.ticket_info
    let priceMin = null
    let priceMax = null
    if (ticketInfo?.is_free === true) {
      priceMin = 0
      priceMax = 0
    } else if (ticketInfo?.price != null) {
      priceMin = ticketInfo.price
      priceMax = ticketInfo.max_price ?? ticketInfo.price
    }
    const currency = ticketInfo?.currency_info?.currency?.toUpperCase() ?? 'INR'

    const slug = event.url
    const eventUrl = slug ? `https://luma.com/${slug}` : ''
    const externalId = `luma_${event.api_id ?? slug}`

    return {
      venue: {
        name: venueName,
        address: venueAddress,
        city,
        latitude: center.lat,
        longitude: center.lng,
      },
      event: {
        title: event.name,
        description: event.description?.trim() || null,
        category_name: 'Events',
        city,
        start_time: event.start_at ?? data.start_at ?? null,
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
    // lu.ma/<city> redirects to luma.com/<city>
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

    // Collect event links — Luma event slugs are 6–12 char lowercase alphanumeric
    const eventUrls = await listPage.$$eval('a[href]', (els, excluded) => {
      const seen = new Set()
      return els.map(el => el.href).filter(href => {
        try {
          const url = new URL(href)
          if (!['lu.ma', 'luma.com'].includes(url.hostname)) return false
          const seg = url.pathname.split('/').filter(Boolean)
          if (seg.length !== 1) return false
          if (excluded.includes(seg[0])) return false
          if (!/^[a-z0-9]{6,12}$/.test(seg[0])) return false
          if (seen.has(seg[0])) return false
          seen.add(seg[0])
          return true
        } catch { return false }
      })
    }, [...EXCLUDED_SLUGS])
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
