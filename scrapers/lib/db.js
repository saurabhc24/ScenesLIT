import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const CATEGORY_ICONS = {
  music: '🎵', concert: '🎵',
  comedy: '😂', stand: '😂',
  food: '🍕', dining: '🍕',
  festival: '🎪', fair: '🎪',
  sport: '⚽', fitness: '🏃',
  art: '🎨', exhibition: '🎨',
  theatre: '🎭', theater: '🎭', drama: '🎭',
  nightlife: '🌙', party: '🌙', club: '🌙',
  workshop: '🔧', class: '🔧',
  tech: '💻', startup: '💻',
  film: '🎬', movie: '🎬',
  kids: '🧒', family: '🧒',
}

function iconForCategory(name = '') {
  const lower = name.toLowerCase()
  for (const [keyword, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(keyword)) return icon
  }
  return '🎭'
}

let _categories = null

async function loadCategories() {
  if (_categories) return _categories
  const { data, error } = await supabase.from('categories').select('*')
  if (error) throw error
  _categories = data
  return _categories
}

export async function ensureCategory(name) {
  const categories = await loadCategories()
  const existing = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, icon: iconForCategory(name) })
    .select('id')
    .single()
  if (error) throw error
  _categories = null // invalidate cache
  return data.id
}

export async function upsertVenue({ name, address, city, latitude, longitude }) {
  // Find existing venue by name + city
  const { data: existing } = await supabase
    .from('venues')
    .select('id')
    .eq('name', name)
    .eq('city', city)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('venues')
    .insert({ name, address, city, latitude, longitude })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function upsertEvent(event) {
  // Check by external_id + source_platform
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('external_id', event.external_id)
    .eq('source_platform', event.source_platform)
    .maybeSingle()

  if (existing) {
    // Update in case details changed (date, price, etc.)
    const { error } = await supabase
      .from('events')
      .update(event)
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, isNew: false }
  }

  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, isNew: true }
}
