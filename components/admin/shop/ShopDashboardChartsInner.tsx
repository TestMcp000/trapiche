'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import type { ShopDashboardChartsProps } from './ShopDashboardCharts';

// =============================================================================
// Constants
// =============================================================================

const GATEWAY_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  linepay: '#00C300',
  ecpay: '#1E88E5',
};

const GATEWAY_LABELS: Record<string, Record<string, string>> = {
  stripe: { en: 'Stripe', zh: 'Stripe' },
  linepay: { en: 'LinePay', zh: 'LinePay' },
  ecpay: { en: 'ECPay', zh: '綠界' },
};

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(cents: number): string {
  return `NT$ ${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// Component
// =============================================================================

export default function ShopDashboardChartsInner({
  revenueData,
  gatewayData,
  locale,
}: ShopDashboardChartsProps) {
  const hasRevenueData = revenueData.some((d) => d.revenue > 0);
  const hasGatewayData = gatewayData.length > 0;

  const formattedRevenueData = revenueData.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date, locale),
    displayRevenue: d.revenue / 100,
  }));

  const pieData = gatewayData.map((d) => ({
    name: GATEWAY_LABELS[d.gateway]?.[locale] || d.gateway,
    value: d.total,
    count: d.count,
    gateway: d.gateway,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {locale === 'zh' ? '營收趨勢' : 'Revenue Trend'}
        </h3>
        {hasRevenueData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formattedRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="formattedDate"
                className="text-xs"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => `${value.toLocaleString()}`}
              />
              <Tooltip
                formatter={(value) => {
                  const num = typeof value === 'number' ? value : 0;
                  return [formatCurrency(num * 100), locale === 'zh' ? '營收' : 'Revenue'];
                }}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  borderColor: 'var(--tooltip-border, #e5e7eb)',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="displayRevenue"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            {locale === 'zh' ? '尚無營收資料' : 'No revenue data yet'}
          </div>
        )}
      </div>

      {/* Gateway Breakdown Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {locale === 'zh' ? '金流佔比' : 'Payment Gateway Breakdown'}
        </h3>
        {hasGatewayData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.gateway}
                    fill={GATEWAY_COLORS[entry.gateway] || '#6B7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const num = typeof value === 'number' ? value : 0;
                  return [formatCurrency(num), String(name)];
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  borderColor: 'var(--tooltip-border, #e5e7eb)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            {locale === 'zh' ? '尚無交易資料' : 'No transaction data yet'}
          </div>
        )}
      </div>
    </div>
  );
}
