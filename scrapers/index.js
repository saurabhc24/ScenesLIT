import { scrapeDistrict } from './sources/district.js'
import { scrapeBookMyShow } from './sources/bookmyshow.js'
import { scrapeLuma } from './sources/luma.js'
import { scrapeUrbanaut } from './sources/urbanaut.js'
import { ensureCategory, upsertVenue, upsertEvent, cleanupPastEvents, deduplicateEvents } from './lib/db.js'

// Configure cities via env or default to major Indian cities
const CITIES = (
  process.env.CITIES ||
  'Mumbai,Delhi,Bengaluru,Hyderabad,Chennai,Pune,Kolkata,Ahmedabad,Goa,Jaipur,Kochi,Chandigarh,Lucknow,Indore'
).split(',').map((c) => c.trim())

const SOURCES = [
  { name: 'District', fn: scrapeDistrict },
  { name: 'BookMyShow', fn: scrapeBookMyShow },
  { name: 'Luma', fn: scrapeLuma },
  { name: 'Urbanaut', fn: scrapeUrbanaut },
]

// Only keep events within 2 months from now
const TWO_MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000
function isWithinTwoMonths(item) {
  const startTime = item.event?.start_time
  if (!startTime) return true // keep events with no date (can't filter)
  const eventDate = new Date(startTime)
  return eventDate.getTime() <= Date.now() + TWO_MONTHS_MS
}

async function processItem({ venue: venueData, event: eventData }) {
  const venueId = await upsertVenue(venueData)
  const categoryId = await ensureCategory(eventData.category_name || 'Events')

  const { category_name, ...eventFields } = eventData
  const result = await upsertEvent({ ...eventFields, venue_id: venueId, category_id: categoryId })
  return result.isNew
}

async function main() {
  console.log(`ScenesLIT scraper — ${new Date().toISOString()}`)
  console.log(`Cities: ${CITIES.join(', ')}\n`)

  process.stdout.write('Cleaning up past events... ')
  const deleted = await cleanupPastEvents()
  console.log(`${deleted} deleted\n`)

  let totalNew = 0
  let totalUpdated = 0
  let totalErrors = 0

  for (const city of CITIES) {
    console.log(`\n=== ${city} ===`)

    for (const source of SOURCES) {
      let items = []
      try {
        process.stdout.write(`  [${source.name}] Fetching... `)
        items = await source.fn(city)
        console.log(`${items.length} events found`)
      } catch (err) {
        console.error(`FAILED — ${err.message}`)
        totalErrors++
        continue
      }

      // Filter out events beyond 2 months
      const filtered = items.filter(isWithinTwoMonths)
      if (filtered.length < items.length) {
        console.log(`    (${items.length - filtered.length} skipped — beyond 2 months)`)
      }

      let newCount = 0
      let updatedCount = 0
      for (const item of filtered) {
        try {
          const isNew = await processItem(item)
          if (isNew) newCount++
          else updatedCount++
        } catch (err) {
          console.error(`    ! "${item.event?.title}": ${err.message}`)
          totalErrors++
        }
      }

      if (items.length > 0) {
        console.log(`  [${source.name}] +${newCount} new, ~${updatedCount} updated`)
        totalNew += newCount
        totalUpdated += updatedCount
      }
    }
  }

  process.stdout.write('\nDeduplicating events... ')
  const dupes = await deduplicateEvents()
  console.log(`${dupes} duplicates removed`)

  console.log(`\n--- Done ---`)
  console.log(`New: ${totalNew} | Updated: ${totalUpdated} | Errors: ${totalErrors}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
