import { scrapeEventbrite } from './sources/eventbrite.js'
import { scrapeDistrict } from './sources/district.js'
import { scrapeTicketmaster } from './sources/ticketmaster.js'
import { ensureCategory, upsertVenue, upsertEvent } from './lib/db.js'

// Configure cities via env or default to major Indian cities
const CITIES = (
  process.env.CITIES ||
  'Mumbai,Delhi,Bengaluru,Hyderabad,Chennai,Pune,Kolkata'
).split(',').map((c) => c.trim())

const SOURCES = [
  { name: 'District', fn: scrapeDistrict },
  { name: 'Eventbrite', fn: scrapeEventbrite },
  { name: 'Ticketmaster', fn: scrapeTicketmaster },
]

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

      let newCount = 0
      let updatedCount = 0
      for (const item of items) {
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

  console.log(`\n--- Done ---`)
  console.log(`New: ${totalNew} | Updated: ${totalUpdated} | Errors: ${totalErrors}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
