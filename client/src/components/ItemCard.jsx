import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ItemCard({ item }) {
  const navigate = useNavigate();

  const firstPhoto = item.photos && item.photos.length > 0 ? item.photos[0] : null;
  const photoUrl = firstPhoto
    ? (firstPhoto.startsWith('/') ? firstPhoto : `/uploads/${firstPhoto}`)
    : null;

  const matchCount = (item.high_matches || 0) + (item.possible_matches || 0);
  const scanCount = item.scan_count ?? 0;
  const lastScanned = item.last_scan;
  const status = item.status || 'active';

  return (
    <div
      onClick={() => navigate(`/items/${item.id}`)}
      className="card cursor-pointer transform transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
    >
      {/* Photo */}
      <div className="h-40 bg-gray-100 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight truncate">
            {item.name}
          </h3>
          <span
            className={`badge flex-shrink-0 ${
              status === 'recovered'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {status === 'recovered' ? 'Recovered' : 'Active'}
          </span>
        </div>

        {item.category && (
          <span className="badge bg-amber-100 text-amber-800 mb-3">
            {item.category}
          </span>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {scanCount} scans
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {matchCount} matches
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {timeAgo(lastScanned)}
          </div>
        </div>
      </div>
    </div>
  );
}
