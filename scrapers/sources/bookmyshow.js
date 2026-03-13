/**
 * BookMyShow — Playwright scraper
 *
 * Step 1: Navigate to the events listing page for a city (JS-rendered)
 * Step 2: Scroll to collect event URLs
 * Step 3: Visit each event page and extract JSON-LD structured data
 *         (Schema.org Event — name, dates, venue, price, image)
 */

import { chromium } from 'playwright'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CONCURRENT_TABS = 3
const MAX_EVENTS = 40

const CITY_SLUG = {
  Mumbai:    'mumbai',
  Delhi:     'delhi',
  Bengaluru: 'bengaluru',
  Hyderabad: 'hyderabad',
  Chennai:   'chennai',
  Pune:      'pune',
  Kolkata:   'kolkata',
  Ahmedabad: 'ahmedabad',
  Goa:       'goa',
}

// Fallback coordinates when JSON-LD has no geo data
const CITY_CENTERS = {
  Mumbai:    { lat: 18.9388, lng: 72.8354 },
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Goa:       { lat: 15.2993, lng: 74.1240 },
}

// Find the Event JSON-LD block from a BMS event page
async function extractJsonLd(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(2000)
  try {
    const scripts = await page.$$eval(
      'script[type="application/ld+json"]',
      (els) => els.map((el) => {
        try { return JSON.parse(el.textContent) } catch { return null }
      }).filter(Boolean)
    )
    return scripts.find((s) => {
      const types = Array.isArray(s['@type']) ? s['@type'] : [s['@type']]
      return types.some((t) => typeof t === 'string' && t.includes('Event'))
    }) || null
  } catch {
    return null
  }
}

// Get event URLs from the BMS explore/events listing page
async function getEventUrls(page, city) {
  const slug = CITY_SLUG[city]
  await page.goto(`https://in.bookmyshow.com/explore/events-${slug}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(3000)

  // Dismiss any modals/overlays
  try { await page.keyboard.press('Escape') } catch {}
  await page.waitForTimeout(500)

  // Scroll to trigger lazy loading
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)
  }

  const urls = await page.$$eval('a[href*="/events/"]', (els) =>
    [...new Set(
      els
        .map((el) => el.href)
        .filter((h) => {
          try {
            const path = new URL(h).pathname
            // Must be /events/{name}/{ET...} — not just /events or /explore/events-*
            return path.startsWith('/events/') && path.split('/').filter(Boolean).length >= 2
          } catch { return false }
        })
    )]
  )

  return urls.slice(0, MAX_EVENTS)
}

// Map JSON-LD Event to our DB shape
function mapJsonLd(ld, city) {
  if (!ld?.name) return null

  const center = CITY_CENTERS[city]
  const geo = ld.location?.geo
  const lat = geo?.latitude ? parseFloat(geo.latitude) : center.lat
  const lng = geo?.longitude ? parseFloat(geo.longitude) : center.lng

  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers
  const priceMin = offers?.lowPrice ?? offers?.price ?? null
  const priceMax = offers?.highPrice ?? offers?.price ?? null
  const currency = offers?.priceCurrency ?? 'INR'

  const ldType = Array.isArray(ld['@type']) ? ld['@type'][0] : ld['@type']
  let categoryName = 'Events'
  if (ldType && ldType !== 'Event') {
    categoryName = ldType.replace(/Event$/, '').trim() || 'Events'
  } else {
    const rawKw = typeof ld.keywords === 'string'
      ? ld.keywords
      : Array.isArray(ld.keywords) ? ld.keywords.join(', ') : ''
    categoryName = rawKw.split(',')[0]?.trim() || 'Events'
  }

  const urlMatch = (ld.url || '').match(/\/(ET\d+)/i)
  const externalId = urlMatch ? `bms_${urlMatch[1]}` : `bms_${ld.name?.slice(0, 60)}`

  const image = Array.isArray(ld.image) ? ld.image[0] : (ld.image || null)

  return {
    venue: {
      name: ld.location?.name || 'Unknown Venue',
      address: ld.location?.address || '',
      city,
      latitude: lat,
      longitude: lng,
    },
    event: {
      title: ld.name,
      description: ld.description?.replace(/&nbsp;/g, ' ').trim() || null,
      category_name: categoryName,
      city,
      start_time: ld.startDate ?? null,
      end_time: ld.endDate ?? null,
      price_min: priceMin,
      price_max: priceMax,
      currency,
      source_platform: 'bookmyshow',
      source_url: ld.url || '',
      image_url: image,
      popularity_score: 0,
      external_id: externalId,
    },
  }
}

export async function scrapeBookMyShow(city) {
  if (!CITY_SLUG[city]) {
    console.warn(`[BookMyShow] No city config for "${city}" — skipping`)
    return []
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })

    // Step 1: collect event URLs from listing page
    const listPage = await context.newPage()
    let eventUrls = []
    try {
      eventUrls = await getEventUrls(listPage, city)
      console.log(`[BookMyShow] Found ${eventUrls.length} event URLs for ${city}`)
    } catch (err) {
      console.error(`[BookMyShow] Listing page failed for ${city}: ${err.message}`)
      return []
    } finally {
      await listPage.close()
    }

    if (eventUrls.length === 0) return []

    // Step 2: fetch each event page in parallel batches
    const ldItems = []
    for (let i = 0; i < eventUrls.length; i += CONCURRENT_TABS) {
      const batch = eventUrls.slice(i, i + CONCURRENT_TABS)
      const pages = await Promise.all(batch.map(() => context.newPage()))

      const settled = await Promise.allSettled(
        pages.map((p, idx) => extractJsonLd(p, batch[idx]))
      )

      await Promise.all(pages.map((p) => p.close()))

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value) {
          ldItems.push(outcome.value)
        }
      }
    }

    return ldItems.map((ld) => mapJsonLd(ld, city)).filter(Boolean)
  } finally {
    await browser.close()
  }
}
