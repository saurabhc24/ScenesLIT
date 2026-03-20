/**
 * Urbanaut (urbanaut.app) — Playwright scraper
 *
 * Step 1: Load the city page, scroll to trigger lazy-loaded cards,
 *         collect all /spot/<slug> links
 * Step 2: Visit each event page, extract JSON-LD Event schema first,
 *         fall back to og: meta tags + DOM selectors
 * Step 3: Map to DB shape; lat/lng falls back to city centre
 *         (Urbanaut doesn't expose coordinates in page data)
 */

import { chromium } from 'playwright'

// Only cities Urbanaut currently covers in India
const CITY_SLUG = {
  Mumbai:    'mumbai',
  Delhi:     'delhi',
  Bengaluru: 'bengaluru',
  Goa:       'goa',
}

const CITY_CENTERS = {
  Mumbai:    { lat: 18.9388, lng: 72.8354 },
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Goa:       { lat: 15.2993, lng: 74.1240 },
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CONCURRENT_TABS = 3
const BASE = 'https://urbanaut.app'

// Visit a single /spot/ page and return raw extracted data
async function scrapeSpotPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(2500)

  // Try JSON-LD Event schema (most reliable)
  const jsonLd = await page.$$eval('script[type="application/ld+json"]', scripts => {
    for (const s of scripts) {
      try {
        const d = JSON.parse(s.textContent)
        if (d['@type'] === 'Event') return d
      } catch {}
    }
    return null
  }).catch(() => null)

  // og: meta + DOM fallbacks
  const meta = await page.evaluate(() => {
    const og = (prop) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || null
    const text = (sel) => document.querySelector(sel)?.textContent?.trim() || null
    const src = (sel) => document.querySelector(sel)?.getAttribute('src') || null

    return {
      title:       og('og:title')       || text('h1') || null,
      description: og('og:description') || text('[class*="description"]') || null,
      imageUrl:    og('og:image')       || src('img[class*="hero"], img[class*="cover"], img[class*="banner"]') || null,
      dateText:    text('time, [class*="date"], [class*="time"]') || null,
      priceText:   text('[class*="price"], [class*="rate"], [class*="cost"]') || null,
      venueText:   text('[class*="location"], [class*="venue"], [class*="address"], address') || null,
      categoryText:text('[class*="category"], [class*="tag"], [class*="type"]') || null,
    }
  })

  return { jsonLd, ...meta, url }
}

// Parse "₹999", "₹500 - ₹2,000", "Free", "Starting from ₹299"
function parsePrice(text) {
  if (!text) return { priceMin: null, priceMax: null }
  if (/free/i.test(text)) return { priceMin: 0, priceMax: 0 }
  const nums = [...text.matchAll(/[\d,]+/g)]
    .map(m => parseInt(m[0].replace(/,/g, ''), 10))
    .filter(n => !isNaN(n))
  return { priceMin: nums[0] ?? null, priceMax: nums[1] ?? nums[0] ?? null }
}

function parseDate(text) {
  if (!text) return null
  try {
    const d = new Date(text)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return null
}

function mapSpotData(raw, city) {
  const center = CITY_CENTERS[city]
  if (!center) return null

  const { jsonLd, title, description, imageUrl, dateText, priceText, venueText, categoryText, url } = raw

  let finalTitle    = title
  let finalStart    = parseDate(dateText)
  let finalEnd      = null
  let finalImage    = imageUrl
  let finalVenue    = venueText || city
  let finalCategory = categoryText || 'Events'
  let finalPriceMin = null
  let finalPriceMax = null

  // Prefer JSON-LD Event schema data when available
  if (jsonLd) {
    finalTitle    = jsonLd.name          || finalTitle
    finalStart    = jsonLd.startDate     || finalStart
    finalEnd      = jsonLd.endDate       || null
    finalImage    = jsonLd.image?.url    || jsonLd.image || finalImage
    finalVenue    = jsonLd.location?.name || finalVenue
    finalCategory = jsonLd.eventStatus   || finalCategory

    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers
    if (offer) {
      const p = parseFloat(offer.price)
      const h = parseFloat(offer.highPrice ?? offer.price)
      finalPriceMin = isNaN(p) ? null : p
      finalPriceMax = isNaN(h) ? null : h
    }
  } else {
    const parsed = parsePrice(priceText)
    finalPriceMin = parsed.priceMin
    finalPriceMax = parsed.priceMax
  }

  if (!finalTitle) return null

  const slug = url.split('/spot/')[1]?.split('/')[0]?.split('?')[0]
  if (!slug) return null

  return {
    venue: {
      name:      finalVenue,
      address:   finalVenue,
      city,
      latitude:  center.lat,
      longitude: center.lng,
    },
    event: {
      title:            finalTitle,
      description:      description?.trim() || null,
      category_name:    finalCategory,
      city,
      start_time:       finalStart,
      end_time:         finalEnd,
      price_min:        finalPriceMin,
      price_max:        finalPriceMax,
      currency:         'INR',
      source_platform:  'urbanaut',
      source_url:       url,
      image_url:        finalImage || null,
      popularity_score: 0,
      external_id:      `urbanaut_${slug}`,
    },
  }
}

export async function scrapeUrbanaut(city) {
  const slug = CITY_SLUG[city]
  if (!slug) return [] // city not covered by Urbanaut

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })

    // Step 1: load city page, scroll, collect /spot/ links
    const listPage = await context.newPage()
    await listPage.goto(`${BASE}/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await listPage.waitForTimeout(3000)

    for (let i = 0; i < 5; i++) {
      await listPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await listPage.waitForTimeout(1500)
    }

    const spotUrls = await listPage.$$eval('a[href]', els => {
      const seen = new Set()
      return els
        .map(el => el.href)
        .filter(href => {
          try {
            const u = new URL(href)
            if (!u.hostname.includes('urbanaut.app')) return false
            if (!u.pathname.startsWith('/spot/')) return false
            const s = u.pathname.split('/spot/')[1]?.split('/')[0]
            if (!s || seen.has(s)) return false
            seen.add(s)
            return true
          } catch { return false }
        })
        .map(href => {
          const u = new URL(href)
          return `https://urbanaut.app${u.pathname}`
        })
    })
    await listPage.close()

    if (spotUrls.length === 0) return []

    // Step 2: visit each event page in batches
    const results = []
    for (let i = 0; i < spotUrls.length; i += CONCURRENT_TABS) {
      const batch = spotUrls.slice(i, i + CONCURRENT_TABS)
      const pages = await Promise.all(batch.map(() => context.newPage()))

      const settled = await Promise.allSettled(
        pages.map((p, idx) => scrapeSpotPage(p, batch[idx]))
      )
      await Promise.all(pages.map(p => p.close()))

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value) {
          const mapped = mapSpotData(outcome.value, city)
          if (mapped) results.push(mapped)
        }
      }
    }

    return results
  } finally {
    await browser.close()
  }
}
