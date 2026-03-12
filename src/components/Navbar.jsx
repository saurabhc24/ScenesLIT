export default function Navbar({ searchTerm, onSearchChange }) {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-50">
      {/* Logo */}
      <div className="flex items-center gap-1.5 select-none">
        <span className="text-xl font-black tracking-tight text-gray-900">Scenes</span>
        <span className="text-xl font-black tracking-tight text-indigo-600">LIT</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events, venues..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-300 transition"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Spacer to balance logo on right */}
      <div className="w-24 hidden md:block" />
    </header>
  )
}
