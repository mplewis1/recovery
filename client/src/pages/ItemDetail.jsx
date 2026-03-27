import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import MatchBadge from '../components/MatchBadge';
import ExportButton from '../components/ExportButton';
import ReportModal from '../components/ReportModal';

const MATCH_FILTERS = ['All', 'high', 'possible', 'unlikely'];

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [matchFilter, setMatchFilter] = useState('All');
  const [scanHistoryOpen, setScanHistoryOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [reportModal, setReportModal] = useState(null); // listing for report modal
  const [markingRecovered, setMarkingRecovered] = useState(false);

  // Fetch item data + listings + scans
  const fetchData = async () => {
    try {
      const [itemRes, listingsRes, scansRes] = await Promise.all([
        fetch(`/api/items/${id}`),
        fetch(`/api/listings/${id}`),
        fetch(`/api/scans/${id}`),
      ]);
      if (!itemRes.ok) throw new Error('Item not found');
      const itemData = await itemRes.json();
      const listingsData = listingsRes.ok ? await listingsRes.json() : [];
      const scansData = scansRes.ok ? await scansRes.json() : [];
      setItem(itemData);
      setMatches(Array.isArray(listingsData) ? listingsData : []);
      setScanHistory(Array.isArray(scansData) ? scansData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Scan now
  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`/api/scans/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      // Refresh all data
      await fetchData();
    } catch (err) {
      alert('Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // Mark recovered
  const handleMarkRecovered = async () => {
    if (!confirm('Mark this item as recovered?')) return;
    setMarkingRecovered(true);
    try {
      const res = await fetch(`/api/items/${id}/recover`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setItem(updated);
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setMarkingRecovered(false);
    }
  };

  // Dismiss listing
  const handleDismiss = async (listingId) => {
    try {
      await fetch(`/api/listings/${listingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      setMatches((prev) =>
        prev.map((m) => (m.id === listingId ? { ...m, status: 'dismissed' } : m))
      );
    } catch {
      alert('Failed to dismiss match.');
    }
  };

  // Mark listing reviewed
  const handleMarkReviewed = async (listingId) => {
    try {
      await fetch(`/api/listings/${listingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed' }),
      });
      setMatches((prev) =>
        prev.map((m) => (m.id === listingId ? { ...m, status: 'reviewed' } : m))
      );
    } catch {
      alert('Failed to update match.');
    }
  };

  // Paste a listing (manual check)
  const handleAnalyze = async () => {
    if (!pasteUrl.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/listings/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, url: pasteUrl }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      if (data.listing) {
        setMatches((prev) => [data.listing, ...prev]);
      }
      setPasteUrl('');
    } catch (err) {
      alert('Failed to analyze listing. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    if (matchFilter === 'All') return true;
    const score = m.match_score || m.matchScore || 'unlikely';
    return score === matchFilter;
  });

  // Sort by confidence: high > possible > unlikely
  const scoreOrder = { high: 0, possible: 1, unlikely: 2 };
  filteredMatches.sort((a, b) => {
    const sa = scoreOrder[a.match_score || a.matchScore || 'unlikely'] ?? 3;
    const sb = scoreOrder[b.match_score || b.matchScore || 'unlikely'] ?? 3;
    return sa - sb;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-32">
        <p className="text-red-400 mb-4">{error || 'Item not found'}</p>
        <button onClick={() => navigate('/')} className="btn-amber">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const status = item.status || 'active';
  const photos = item.photos || [];

  return (
    <div className="py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to items
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{item.name}</h1>
            {item.category && (
              <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {item.category}
              </span>
            )}
            <span
              className={`badge ${
                status === 'recovered'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}
            >
              {status === 'recovered' ? 'Recovered' : 'Active'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn-amber flex items-center gap-2 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900" />
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan Now
              </>
            )}
          </button>
          {status !== 'recovered' && (
            <button
              onClick={handleMarkRecovered}
              disabled={markingRecovered}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {markingRecovered ? 'Updating...' : 'Mark as Recovered'}
            </button>
          )}
          <ExportButton itemId={id} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left column - Item info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photos */}
          {photos.length > 0 && (
            <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Reference Photos
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo.startsWith('/') ? photo : `/uploads/${photo}`}
                    alt={`${item.name} photo ${i + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Item Profile
            </h3>
            <div className="space-y-2 text-sm">
              {item.brand && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Brand</span>
                  <span className="text-white">{item.brand}</span>
                </div>
              )}
              {item.approximate_value && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Value</span>
                  <span className="text-white">{item.approximate_value}</span>
                </div>
              )}
              {item.serial_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Serial #</span>
                  <span className="text-white font-mono text-xs">{item.serial_number}</span>
                </div>
              )}
              {item.color && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Color</span>
                  <span className="text-white">{item.color}</span>
                </div>
              )}
              {item.material && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Material</span>
                  <span className="text-white">{item.material}</span>
                </div>
              )}
              {item.description && (
                <div className="pt-2 border-t border-navy-700">
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scanner config */}
          <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Scanner Config
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Location</span>
                <span className="text-white">{item.city || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Radius</span>
                <span className="text-white">{item.search_radius || item.searchRadius || '50'} mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Frequency</span>
                <span className="text-white">{item.scan_frequency || item.scanFrequency || 'Daily'}</span>
              </div>
            </div>
          </div>

          {/* Scan History */}
          <div className="bg-navy-800 rounded-xl border border-navy-700">
            <button
              onClick={() => setScanHistoryOpen(!scanHistoryOpen)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Scan History ({scanHistory.length})
              </h3>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${scanHistoryOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {scanHistoryOpen && (
              <div className="px-4 pb-4 space-y-2">
                {scanHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No scans yet.</p>
                ) : (
                  scanHistory.slice(0, 10).map((scan, i) => (
                    <div key={scan.id || i} className="flex items-center justify-between text-sm py-1.5 border-t border-navy-700">
                      <span className="text-gray-400">
                        {new Date(scan.ran_at).toLocaleString()}
                      </span>
                      <span className="text-gray-300">
                        {scan.platform} &middot; {scan.listings_found || 0} found, {scan.matches_flagged || 0} flagged
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Matches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Matches header & filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              Matches ({matches.length})
            </h2>
            <div className="flex gap-1 bg-navy-800 rounded-lg p-1 text-sm">
              {MATCH_FILTERS.map((f) => {
                const labels = {
                  All: 'All',
                  high: '\uD83D\uDD34 High',
                  possible: '\uD83D\uDFE1 Possible',
                  unlikely: '\u26AA Unlikely',
                };
                return (
                  <button
                    key={f}
                    onClick={() => setMatchFilter(f)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      matchFilter === f
                        ? 'bg-amber-500 text-navy-900'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matches list */}
          {filteredMatches.length === 0 ? (
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">
                {matchFilter === 'All'
                  ? 'No matches found yet. Run a scan or paste a listing URL below.'
                  : `No ${matchFilter} matches.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <div key={match.id} className="relative">
                  <ListingCard
                    listing={match}
                    onDismiss={handleDismiss}
                    onMarkReviewed={handleMarkReviewed}
                  />
                  {/* Report button for eBay listings */}
                  {(match.platform || '').toLowerCase() === 'ebay' && (
                    <button
                      onClick={() => setReportModal(match)}
                      className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium flex items-center gap-1 ml-4"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      Report to Platform
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paste a Listing */}
          <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
            <h3 className="text-base font-semibold text-white mb-1">
              Paste a Listing
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Manually check a listing URL against this item. Useful for Facebook
              Marketplace and other platforms we can't auto-scan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                className="input-field flex-1"
                placeholder="https://www.ebay.com/itm/..."
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !pasteUrl.trim()}
                className="btn-amber flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {reportModal && (
        <ReportModal
          item={item}
          listing={reportModal}
          onClose={() => setReportModal(null)}
        />
      )}
    </div>
  );
}
