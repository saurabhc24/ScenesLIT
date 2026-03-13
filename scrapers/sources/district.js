/**
 * District (district.in) — Playwright-based scraper
 *
 * Uses a headless browser to intercept the API calls the website makes,
 * so no manual endpoint discovery is needed. Works even if the API URL changes.
 *
 * First run on a new machine: npx playwright install chromium
 * (done automatically by the GitHub Actions workflow)
 */

import { chromium } from 'playwright'

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

function isEventListResponse(body) {
  if (!body || typeof body !== 'object') return false
  const arr = Array.isArray(body)
    ? body
    : (body.data ?? body.events ?? body.results ?? null)
  return Array.isArray(arr) && arr.length > 0 && (arr[0].name || arr[0].title)
}

function extractEvents(body) {
  if (Array.isArray(body)) return body
  return body.data ?? body.events ?? body.results ?? []
}

export async function scrapeDistrict(city) {
  const citySlug = CITY_SLUGS[city]
  if (!citySlug) {
    console.warn(`[District] No city slug for "${city}" — skipping`)
    return []
  }

  let browser
  const intercepted = []

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    const page = await context.newPage()

    // Intercept all API responses that look like event lists
    page.on('response', async (response) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] || ''
      if (!contentType.includes('application/json')) return
      if (!url.includes('event') && !url.includes('listing') && !url.includes('discover')) return

      try {
        const body = await response.json()
        if (isEventListResponse(body)) {
          console.log(`[District] Intercepted: ${url.slice(0, 80)}`)
          intercepted.push(...extractEvents(body))
        }
      } catch {
        // parse error — skip
      }
    })

    await page.goto(`https://district.in/events?city=${citySlug}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Scroll to trigger lazy-loaded content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

  } catch (err) {
    console.error(`[District] Browser error for ${city}: ${err.message}`)
    return []
  } finally {
    await browser?.close()
  }

  if (intercepted.length === 0) {
    console.warn(`[District] No events intercepted for ${city} — site structure may have changed`)
    return []
  }

  console.log(`[District] Got ${intercepted.length} raw events for ${city}`)

  const results = []
  for (const ev of intercepted) {
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
        source_platform: 'district',
        source_url: slug ? `https://district.in/${slug}` : 'https://district.in',
        image_url:
          ev.horizontal_cover_image ??
          ev.cover_image ??
          ev.image ??
          ev.thumbnail ??
          null,
        popularity_score: ev.popularity_score ?? 0,
        external_id: `district_${ev._id ?? ev.id ?? slug}`,
      },
    })
  }

  return results
}
