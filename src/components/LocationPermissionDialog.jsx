const CITIES = [
  { name: 'Mumbai', lat: 18.9388, lng: 72.8354 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Goa', lat: 15.2993, lng: 74.124 },
]

export default function LocationPermissionDialog({ open, onAllow, onSelectCity }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white md:dark:bg-gray-800 rounded-2xl shadow-xl w-[90%] max-w-sm p-6 flex flex-col gap-5 animate-fade-in">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 bg-indigo-50 md:dark:bg-indigo-950 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 md:dark:text-white">Discover events near you</h2>
          <p className="text-sm text-gray-500 md:dark:text-gray-400 mt-1">Allow location access to see what's happening around you</p>
        </div>

        <button
          onClick={onAllow}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Allow Location
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 md:dark:bg-gray-700" />
          <span className="text-xs text-gray-400 md:dark:text-gray-500">or pick a city</span>
          <div className="flex-1 h-px bg-gray-200 md:dark:bg-gray-700" />
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => onSelectCity(city.lat, city.lng)}
              className="px-3 py-1.5 bg-gray-100 md:dark:bg-gray-700 text-gray-700 md:dark:text-gray-300 text-xs font-medium rounded-full hover:bg-indigo-50 md:dark:hover:bg-indigo-950 hover:text-indigo-600 md:dark:hover:text-indigo-400 transition-colors"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
