import { useState } from 'react';
import MatchBadge from './MatchBadge';

const platformStyles = {
  ebay: 'bg-blue-100 text-blue-800',
  craigslist: 'bg-purple-100 text-purple-800',
  manual: 'bg-gray-100 text-gray-700',
};

export default function ListingCard({ listing, onDismiss, onMarkReviewed }) {
  const [expanded, setExpanded] = useState(false);

  const platform = (listing.platform || 'manual').toLowerCase();
  const images = listing.images || [];
  const imageUrl = images.length > 0 ? images[0] : null;
  const matchScore = listing.match_score || listing.matchScore || 'unlikely';
  const aiAnalysis = listing.ai_analysis || listing.aiAnalysis || '';
  const listingUrl = listing.listing_url || listing.listingUrl || listing.url;
  const dismissed = listing.dismissed || listing.status === 'dismissed';

  return (
    <div
      className={`card transition-all duration-200 ${
        dismissed ? 'opacity-50' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          {imageUrl && (
            <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`badge ${platformStyles[platform] || platformStyles.manual}`}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </span>
              <MatchBadge score={matchScore} />
              {listing.status === 'reviewed' && (
                <span className="badge bg-green-100 text-green-700">Reviewed</span>
              )}
            </div>

            <h4
              className="font-semibold text-gray-900 leading-tight cursor-pointer hover:text-amber-600 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {listing.title || 'Untitled Listing'}
            </h4>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
              {listing.price && (
                <span className="font-medium text-gray-700">{listing.price}</span>
              )}
              {listing.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {listing.location}
                </span>
              )}
            </div>

            {/* AI analysis - truncated or full */}
            {aiAnalysis && (
              <div className="mt-2">
                <p
                  className={`text-sm text-gray-600 ${
                    expanded ? '' : 'line-clamp-2'
                  }`}
                >
                  {aiAnalysis}
                </p>
                {aiAnalysis.length > 150 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-amber-600 hover:text-amber-700 mt-1 font-medium"
                  >
                    {expanded ? 'Show less' : 'Read full analysis'}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {listingUrl && (
                <a
                  href={listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Listing
                </a>
              )}
              {onDismiss && !dismissed && (
                <button
                  onClick={() => onDismiss(listing.id)}
                  className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors"
                >
                  Dismiss
                </button>
              )}
              {onMarkReviewed && listing.status !== 'reviewed' && (
                <button
                  onClick={() => onMarkReviewed(listing.id)}
                  className="text-sm text-gray-400 hover:text-green-600 font-medium transition-colors"
                >
                  Mark Reviewed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
