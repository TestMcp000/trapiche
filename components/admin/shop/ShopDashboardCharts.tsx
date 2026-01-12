'use client';

import dynamic from 'next/dynamic';

// =============================================================================
// Types (exported for use by parent components)
// =============================================================================

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface GatewayBreakdown {
  gateway: string;
  count: number;
  total: number;
}

export interface ShopDashboardChartsProps {
  revenueData: RevenueDataPoint[];
  gatewayData: GatewayBreakdown[];
  locale: string;
}

// =============================================================================
// Loading Placeholder
// =============================================================================

function ChartsLoadingPlaceholder() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="h-[300px] bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="h-[300px] bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Dynamic Import (lazy load recharts)
// =============================================================================

const ShopDashboardChartsInner = dynamic(
  () => import('./ShopDashboardChartsInner'),
  {
    ssr: false,
    loading: () => <ChartsLoadingPlaceholder />,
  }
);

// =============================================================================
// Exported Wrapper Component
// =============================================================================

export default function ShopDashboardCharts(props: ShopDashboardChartsProps) {
  return <ShopDashboardChartsInner {...props} />;
}
