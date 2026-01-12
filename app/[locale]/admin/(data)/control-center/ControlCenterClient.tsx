'use client';

/**
 * Control Center Client Component
 *
 * Client component for semantic, keyword, and hybrid search UI.
 * Provides search input, target type filters, search mode selection,
 * weight slider for hybrid mode, results display, and analytics panel.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §3.1, Phase 7, Phase 8
 * @see uiux_refactor.md §6.3.2 item 1
 * @see uiux_refactor.md §4 item 8 (Search Analytics)
 */

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import type {
  EmbeddingTargetType,
  SemanticSearchResult,
  KeywordSearchResult,
  HybridSearchResult,
  SearchMode,
  SearchLogListItem,
  SearchLogStats,
} from '@/lib/types/embedding';
import { HYBRID_SEARCH_DEFAULTS } from '@/lib/validators/embedding';
import {
  semanticSearchAction,
  keywordSearchAction,
  hybridSearchAction,
  listSearchLogsAction,
  getSearchLogStatsAction,
  getLowQualityQueriesAction,
} from './actions';

interface ControlCenterClientProps {
  initialData: {
    role: 'owner' | 'editor';
    enabled: boolean;
    targetTypes: readonly string[];
  };
}

/** Minimum query length to trigger search */
const MIN_QUERY_LENGTH = 2;

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 300;

/** Target type display names */
const TARGET_TYPE_LABELS: Record<EmbeddingTargetType, string> = {
  product: 'Products',
  post: 'Blog Posts',
  gallery_item: 'Gallery Items',
  comment: 'Comments',
};

/** Search mode display names */
const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  semantic: 'Semantic',
  keyword: 'Keyword',
  hybrid: 'Hybrid',
};

/** Search mode descriptions */
const SEARCH_MODE_DESCRIPTIONS: Record<SearchMode, string> = {
  semantic: 'Find content by meaning similarity (AI-powered)',
  keyword: 'Find content with matching text (exact terms)',
  hybrid: 'Combine semantic and keyword search with weights',
};

/** Get admin route for target type */
function getAdminRoute(targetType: EmbeddingTargetType, targetId: string): string {
  switch (targetType) {
    case 'product':
      return `/admin/shop/products?id=${targetId}`;
    case 'post':
      return `/admin/blog?id=${targetId}`;
    case 'gallery_item':
      return `/admin/gallery?id=${targetId}`;
    case 'comment':
      return `/admin/comments?id=${targetId}`;
    default:
      return '#';
  }
}

/** Format score as percentage */
function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/** Union type for all search results */
type SearchResult = SemanticSearchResult | KeywordSearchResult | HybridSearchResult;

/** Type guard for hybrid results */
function isHybridResult(result: SearchResult): result is HybridSearchResult {
  return 'combinedScore' in result;
}

/** Type guard for keyword results */
function isKeywordResult(result: SearchResult): result is KeywordSearchResult {
  return 'tsRank' in result;
}

/** Get display score based on result type */
function getDisplayScore(result: SearchResult): { label: string; value: string } {
  if (isHybridResult(result)) {
    return { label: 'Combined', value: formatScore(result.combinedScore) };
  }
  if (isKeywordResult(result)) {
    return { label: 'Relevance', value: result.tsRank.toFixed(3) };
  }
  return { label: 'Similarity', value: formatScore(result.similarity) };
}

/** Format date/time */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ControlCenterClient({ initialData }: ControlCenterClientProps) {
  const [isPending, startTransition] = useTransition();
  
  // Search mode state
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic');
  
  // Hybrid weights
  const [semanticWeight, setSemanticWeight] = useState<number>(HYBRID_SEARCH_DEFAULTS.semanticWeight);
  const keywordWeight = 1 - semanticWeight;
  
  // Search state
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<EmbeddingTargetType[]>(
    initialData.targetTypes.filter((t): t is EmbeddingTargetType => 
      t !== 'comment' // Exclude comments by default
    )
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Analytics state
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsStats, setAnalyticsStats] = useState<SearchLogStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<SearchLogListItem[]>([]);
  const [lowQualityQueries, setLowQualityQueries] = useState<SearchLogListItem[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<'recent' | 'low-quality'>('recent');
  
  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [statsResult, recentResult, lowQualityResult] = await Promise.all([
        getSearchLogStatsAction(),
        listSearchLogsAction(30, false),
        getLowQualityQueriesAction(20),
      ]);
      
      if (statsResult.success) setAnalyticsStats(statsResult.data);
      if (recentResult.success) setRecentQueries(recentResult.data);
      if (lowQualityResult.success) setLowQualityQueries(lowQualityResult.data);
    } catch (err) {
      console.error('[loadAnalytics] Error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Load analytics when panel is opened
  useEffect(() => {
    if (showAnalytics) {
      loadAnalytics();
    }
  }, [showAnalytics, loadAnalytics]);

  // Perform search based on mode
  const performSearch = useCallback(
    (searchQuery: string, types: EmbeddingTargetType[], mode: SearchMode, semWeight: number) => {
      if (searchQuery.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      startTransition(async () => {
        setError(null);
        
        let result;
        switch (mode) {
          case 'keyword':
            result = await keywordSearchAction(searchQuery, types, 20);
            break;
          case 'hybrid':
            result = await hybridSearchAction(searchQuery, types, 20, semWeight, 1 - semWeight);
            break;
          case 'semantic':
          default:
            result = await semanticSearchAction(searchQuery, types, 20);
            break;
        }
        
        if (!result.success) {
          setError(result.error);
          setResults([]);
        } else {
          setResults(result.data);
        }
        setHasSearched(true);
      });
    },
    []
  );

  // Debounced search on query/mode/weight change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, selectedTypes, searchMode, semanticWeight);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, selectedTypes, searchMode, semanticWeight, performSearch]);

  // Handle type toggle
  const handleTypeToggle = (type: EmbeddingTargetType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting all types
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  // Handle weight slider change
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSemanticWeight(parseFloat(e.target.value));
  };

  // Handle click on analytics query (refill search)
  const handleQueryClick = (logItem: SearchLogListItem) => {
    setQuery(logItem.query);
    setSearchMode(logItem.mode);
    setShowAnalytics(false);
  };

  // Show not enabled message
  if (!initialData.enabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Control Center</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            Semantic Search Not Available
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            No embeddings have been generated yet. Embeddings are created when content is added 
            and the embedding queue is processed.
          </p>
          <p className="text-yellow-600 text-xs mt-2">
            Ensure the <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code> environment 
            variable is set and the embedding Edge Function is deployed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Control Center</h1>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAnalytics
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
        </button>
      </div>
      <p className="text-gray-600 mb-6">
        Search across your content using semantic similarity, keyword matching, or a hybrid approach.
      </p>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Search Analytics</h2>
            <button
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {analyticsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Stats Grid */}
          {analyticsStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.totalQueries}
                </div>
                <div className="text-xs text-gray-500">Total Queries</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-red-600">
                  {analyticsStats.lowQualityCount}
                </div>
                <div className="text-xs text-gray-500">
                  Low Quality ({analyticsStats.lowQualityPercentage}%)
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.avgResultsCount}
                </div>
                <div className="text-xs text-gray-500">Avg Results</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.avgTopScore !== null
                    ? formatScore(analyticsStats.avgTopScore)
                    : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Avg Top Score</div>
              </div>
            </div>
          )}

          {/* Mode Distribution */}
          {analyticsStats && analyticsStats.totalQueries > 0 && (
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-gray-600">
                By Mode:
              </span>
              <span className="text-blue-600">
                Semantic: {analyticsStats.byMode.semantic}
              </span>
              <span className="text-green-600">
                Keyword: {analyticsStats.byMode.keyword}
              </span>
              <span className="text-purple-600">
                Hybrid: {analyticsStats.byMode.hybrid}
              </span>
            </div>
          )}

          {/* Query List Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAnalyticsFilter('recent')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                analyticsFilter === 'recent'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recent Queries ({recentQueries.length})
            </button>
            <button
              onClick={() => setAnalyticsFilter('low-quality')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                analyticsFilter === 'low-quality'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Low Quality ({lowQualityQueries.length})
            </button>
          </div>

          {/* Query List */}
          <div className="bg-white rounded-lg border max-h-60 overflow-y-auto">
            {(analyticsFilter === 'recent' ? recentQueries : lowQualityQueries).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No queries recorded yet.
              </div>
            ) : (
              <div className="divide-y">
                {(analyticsFilter === 'recent' ? recentQueries : lowQualityQueries).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQueryClick(item)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          item.mode === 'semantic'
                            ? 'bg-blue-100 text-blue-700'
                            : item.mode === 'keyword'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.mode[0].toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-900 truncate">
                        {item.query}
                      </span>
                      {item.isLowQuality && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          Low
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                      <span>{item.resultsCount} results</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span className="text-blue-600 opacity-0 group-hover:opacity-100">
                        Use →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {analyticsFilter === 'low-quality' && lowQualityQueries.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Click a query to search again. Consider adding more content or adjusting embeddings for these topics.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Search Mode Tabs */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Mode
        </label>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['semantic', 'keyword', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {SEARCH_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {SEARCH_MODE_DESCRIPTIONS[searchMode]}
        </p>
      </div>

      {/* Hybrid Weight Slider */}
      {searchMode === 'hybrid' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            Search Weight Balance
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-700 w-28">
              Semantic: {formatScore(semanticWeight)}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={semanticWeight}
              onChange={handleWeightChange}
              className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-blue-700 w-28 text-right">
              Keyword: {formatScore(keywordWeight)}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Adjust the balance between semantic (meaning) and keyword (exact match) search.
          </p>
        </div>
      )}

      {/* Search Section */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
            Search Query
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {query.length > 0 && query.length < MIN_QUERY_LENGTH && (
            <p className="text-xs text-gray-500 mt-1">
              Enter at least {MIN_QUERY_LENGTH} characters to search
            </p>
          )}
        </div>

        {/* Target Type Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Types
          </label>
          <div className="flex flex-wrap gap-2">
            {(initialData.targetTypes as EmbeddingTargetType[]).map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {TARGET_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="border rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            Search Results
            {hasSearched && (
              <span className="text-gray-500 font-normal ml-2">
                ({results.length} found)
              </span>
            )}
            {hasSearched && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">
                {SEARCH_MODE_LABELS[searchMode]}
              </span>
            )}
          </h2>
          {isPending && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          )}
        </div>

        <div className="p-4">
          {!hasSearched && !isPending && (
            <p className="text-gray-500 text-center py-8">
              Enter a search query to find similar content
            </p>
          )}

          {hasSearched && results.length === 0 && !isPending && (
            <p className="text-gray-500 text-center py-8">
              No results found. Try a different query or adjust filters.
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => {
                const scoreInfo = getDisplayScore(result);
                return (
                  <a
                    key={`${result.targetType}-${result.targetId}-${index}`}
                    href={getAdminRoute(result.targetType, result.targetId)}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            result.targetType === 'product'
                              ? 'bg-purple-100 text-purple-800'
                              : result.targetType === 'post'
                              ? 'bg-blue-100 text-blue-800'
                              : result.targetType === 'gallery_item'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {TARGET_TYPE_LABELS[result.targetType]}
                        </span>
                        <span className="text-sm text-gray-600 font-mono truncate max-w-[200px]">
                          {result.targetId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Show detailed scores for hybrid mode */}
                        {isHybridResult(result) && (
                          <div className="flex gap-2 text-xs text-gray-500 mr-2">
                            <span>S: {formatScore(result.semanticScore)}</span>
                            <span>K: {formatScore(result.keywordScore)}</span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-green-600" title={scoreInfo.label}>
                          {scoreInfo.value}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
