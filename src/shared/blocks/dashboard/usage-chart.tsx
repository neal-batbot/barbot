'use client';

import { useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';

interface DailyDataItem {
  date: string;
  tokens: number;
  requests: number;
}

interface BreakdownItem {
  key: string;
  tokens: number;
  requests: number;
}

interface UsageChartProps {
  dailyData: DailyDataItem[];
  breakdownData: BreakdownItem[];
}

export function UsageChart({ dailyData, breakdownData }: UsageChartProps) {
  const t = useTranslations('dashboard.usage');
  const [view, setView] = useState<'by_day' | 'by_product'>('by_day');

  const handleByDay = useCallback(() => setView('by_day'), []);
  const handleByProduct = useCallback(() => setView('by_product'), []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t('chart.tokens')}</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === 'by_day' ? 'default' : 'outline'}
            onClick={handleByDay}
          >
            {t('chart.by_day')}
          </Button>
          <Button
            size="sm"
            variant={view === 'by_product' ? 'default' : 'outline'}
            onClick={handleByProduct}
          >
            {t('chart.by_product')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64">
          {view === 'by_day' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#6366f1"
                  fill="#6366f120"
                  name={t('chart.tokens')}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tokens" fill="#6366f1" name={t('chart.tokens')} />
                <Bar dataKey="requests" fill="#22c55e" name={t('chart.requests')} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
