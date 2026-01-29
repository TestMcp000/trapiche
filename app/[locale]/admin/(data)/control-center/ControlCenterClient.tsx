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
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getErrorLabel } from '@/lib/types/action-result';
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
  routeLocale: string;
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

/** Get admin route for target type */
function getAdminRoute(
  locale: string,
  targetType: EmbeddingTargetType,
  targetId: string
): string | null {
  switch (targetType) {
    case 'post':
      return `/${locale}/admin/posts/${targetId}/edit`;
    case 'gallery_item':
      return `/${locale}/admin/gallery/${targetId}`;
    case 'comment':
      return `/${locale}/admin/comments?search=${encodeURIComponent(targetId)}`;
    default:
      return null;
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

/** Format date/time */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ControlCenterClient({ initialData, routeLocale }: ControlCenterClientProps) {
  const t = useTranslations('admin.data.controlCenter');
  const tc = useTranslations('admin.data.common');

  const [isPending, startTransition] = useTransition();
  
  // Search mode state
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic');
  
  // Hybrid weights
  const [semanticWeight, setSemanticWeight] = useState<number>(HYBRID_SEARCH_DEFAULTS.semanticWeight);
  const keywordWeight = 1 - semanticWeight;
  
  // Search state
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<EmbeddingTargetType[]>(
    initialData.targetTypes
      .filter(
        (t): t is EmbeddingTargetType =>
          t === 'post' || t === 'gallery_item' || t === 'comment'
      )
      .filter((t) => t !== 'comment') // Exclude comments by default
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
          setError(getErrorLabel(result.errorCode, routeLocale));
          setResults([]);
        } else {
          setResults(result.data);
        }
        setHasSearched(true);
      });
    },
    [routeLocale]
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
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            {t('notAvailable')}
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            {t('notAvailableDesc')}
          </p>
          <p className="text-yellow-600 text-xs mt-2">
            {t('notAvailableHint')}
          </p>
        </div>
      </div>
    );
  }

  const getModeLabel = (mode: SearchMode): string => t(`modes.${mode}`);
  const getModeDescription = (mode: SearchMode): string => t(`modeDescriptions.${mode}`);
  const getTargetTypeLabel = (type: EmbeddingTargetType): string => t(`targetTypes.${type}`);

  const getDisplayScore = (result: SearchResult): { label: string; value: string } => {
    if (isHybridResult(result)) {
      return { label: t('scores.combined'), value: formatScore(result.combinedScore) };
    }
    if (isKeywordResult(result)) {
      return { label: t('scores.relevance'), value: result.tsRank.toFixed(3) };
    }
    return { label: t('scores.similarity'), value: formatScore(result.similarity) };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAnalytics
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showAnalytics ? t('hideAnalytics') : t('showAnalytics')}
        </button>
      </div>
      <p className="text-gray-600 mb-6">
        {t('description')}
      </p>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('analytics.title')}</h2>
            <button
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {analyticsLoading ? tc('loading') : t('analytics.refresh')}
            </button>
          </div>

          {/* Stats Grid */}
          {analyticsStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.totalQueries}
                </div>
                <div className="text-xs text-gray-500">{t('analytics.totalQueries')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-red-600">
                  {analyticsStats.lowQualityCount}
                </div>
                <div className="text-xs text-gray-500">
                  {t('analytics.lowQuality')} ({analyticsStats.lowQualityPercentage}%)
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.avgResultsCount}
                </div>
                <div className="text-xs text-gray-500">{t('analytics.avgResults')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">
                  {analyticsStats.avgTopScore !== null
                    ? formatScore(analyticsStats.avgTopScore)
                    : '-'}
                </div>
                <div className="text-xs text-gray-500">{t('analytics.avgTopScore')}</div>
              </div>
            </div>
          )}

          {/* Mode Distribution */}
          {analyticsStats && analyticsStats.totalQueries > 0 && (
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-gray-600">{t('analytics.byMode')}:</span>
              <span className="text-blue-600">
                {t('modes.semantic')}: {analyticsStats.byMode.semantic}
              </span>
              <span className="text-green-600">
                {t('modes.keyword')}: {analyticsStats.byMode.keyword}
              </span>
              <span className="text-purple-600">
                {t('modes.hybrid')}: {analyticsStats.byMode.hybrid}
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
              {t('analytics.recentQueries')} ({recentQueries.length})
            </button>
            <button
              onClick={() => setAnalyticsFilter('low-quality')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                analyticsFilter === 'low-quality'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('analytics.lowQualityQueries')} ({lowQualityQueries.length})
            </button>
          </div>

          {/* Query List */}
          <div className="bg-white rounded-lg border max-h-60 overflow-y-auto">
            {(analyticsFilter === 'recent' ? recentQueries : lowQualityQueries).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {t('analytics.noQueries')}
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
                        {getModeLabel(item.mode)}
                      </span>
                      <span className="text-sm text-gray-900 truncate">
                        {item.query}
                      </span>
                      {item.isLowQuality && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          {t('analytics.lowQuality')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                      <span>
                        {item.resultsCount} {t('analytics.results')}
                      </span>
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span className="text-blue-600 opacity-0 group-hover:opacity-100">
                        {t('analytics.use')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {analyticsFilter === 'low-quality' && lowQualityQueries.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {t('analytics.lowQualityHint')}
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
          {t('searchMode')}
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
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getModeDescription(searchMode)}
        </p>
      </div>

      {/* Hybrid Weight Slider */}
      {searchMode === 'hybrid' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            {t('hybrid.weightBalance')}
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-700 w-28">
              {t('hybrid.semantic')}: {formatScore(semanticWeight)}
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
              {t('hybrid.keyword')}: {formatScore(keywordWeight)}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {t('hybrid.adjustHint')}
          </p>
        </div>
      )}

      {/* Search Section */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
            {t('searchQuery')}
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {query.length > 0 && query.length < MIN_QUERY_LENGTH && (
            <p className="text-xs text-gray-500 mt-1">
              {t('minChars', { min: MIN_QUERY_LENGTH })}
            </p>
          )}
        </div>

        {/* Target Type Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('contentTypes')}
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
                  {getTargetTypeLabel(type)}
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
            {t('searchResults')}
            {hasSearched && (
              <span className="text-gray-500 font-normal ml-2">
                ({results.length} {t('found')})
              </span>
            )}
            {hasSearched && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">
                {getModeLabel(searchMode)}
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
              {t('enterQuery')}
            </p>
          )}

          {hasSearched && results.length === 0 && !isPending && (
            <p className="text-gray-500 text-center py-8">
              {t('noResults')}
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => {
                const scoreInfo = getDisplayScore(result);
                const href = getAdminRoute(routeLocale, result.targetType, result.targetId);
                const containerClass = `block p-3 rounded-lg border transition-colors ${
                  href ? 'hover:bg-gray-50' : 'opacity-70 cursor-not-allowed'
                }`;
                return (
                  href ? (
                    <Link
                      key={`${result.targetType}-${result.targetId}-${index}`}
                      href={href}
                      className={containerClass}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              result.targetType === 'post'
                                ? 'bg-blue-100 text-blue-800'
                                : result.targetType === 'gallery_item'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {getTargetTypeLabel(result.targetType)}
                          </span>
                          <span className="text-sm text-gray-600 font-mono truncate max-w-[200px]">
                            {result.targetId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Show detailed scores for hybrid mode */}
                          {isHybridResult(result) && (
                            <div className="flex gap-2 text-xs text-gray-500 mr-2">
                              <span>
                                {t('hybrid.semantic')}: {formatScore(result.semanticScore)}
                              </span>
                              <span>
                                {t('hybrid.keyword')}: {formatScore(result.keywordScore)}
                              </span>
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
                    </Link>
                  ) : (
                    <div
                      key={`${result.targetType}-${result.targetId}-${index}`}
                      className={containerClass}
                      aria-disabled="true"
                    >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            result.targetType === 'post'
                              ? 'bg-blue-100 text-blue-800'
                              : result.targetType === 'gallery_item'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getTargetTypeLabel(result.targetType)}
                        </span>
                        <span className="text-sm text-gray-600 font-mono truncate max-w-[200px]">
                          {result.targetId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Show detailed scores for hybrid mode */}
                        {isHybridResult(result) && (
                          <div className="flex gap-2 text-xs text-gray-500 mr-2">
                            <span>
                              {t('hybrid.semantic')}: {formatScore(result.semanticScore)}
                            </span>
                            <span>
                              {t('hybrid.keyword')}: {formatScore(result.keywordScore)}
                            </span>
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
                    </div>
                  )
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
