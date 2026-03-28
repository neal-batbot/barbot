'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { MainHeader } from '@/shared/blocks/dashboard/main-header';
import { UsageSummaryCards } from '@/shared/blocks/dashboard/usage-summary-cards';
import { UsageChart } from '@/shared/blocks/dashboard/usage-chart';
import { UsageTable } from '@/shared/blocks/dashboard/usage-table';
import { UsageExportButton } from '@/shared/blocks/dashboard/usage-export-button';
import { Button } from '@/shared/components/ui/button';

type Period = '7d' | '30d' | '90d';
type AppFilter = 'all' | 'harvey';

interface SummaryData {
  summary: { totalTokens: number; totalCost: string; totalRequests: number };
  breakdown: { key: string; tokens: number; cost: string; requests: number }[];
  daily: { date: string; tokens: number; cost: string; requests: number }[];
}

interface LogsData {
  data: {
    id: string;
    appId: string;
    product: string;
    model?: string | null;
    type: string;
    tokens?: number | null;
    cost?: string | null;
    status?: string | null;
    createdAt: string;
  }[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const PERIODS: Period[] = ['7d', '30d', '90d'];

const emptySummary: SummaryData = {
  summary: { totalTokens: 0, totalCost: '0.0000', totalRequests: 0 },
  breakdown: [],
  daily: [],
};

const emptyLogs: LogsData = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
};

export function UsagePageClient() {
  const t = useTranslations('dashboard.usage');

  const [period, setPeriod] = useState<Period>('7d');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [page, setPage] = useState(1);
  const [summaryData, setSummaryData] = useState<SummaryData>(emptySummary);
  const [logsData, setLogsData] = useState<LogsData>(emptyLogs);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = useCallback(async (p: Period, app: AppFilter) => {
    const appQuery = app === 'all' ? '' : `&app_id=${app}`;
    const res = await fetch(`/api/v1/usage/summary?period=${p}&group_by=product${appQuery}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.code === 0 && json.data) {
      setSummaryData(json.data);
    }
  }, []);

  const fetchLogs = useCallback(async (currentPage: number, app: AppFilter) => {
    const appQuery = app === 'all' ? '' : `&app_id=${app}`;
    const res = await fetch(`/api/v1/usage/logs?page=${currentPage}&limit=20${appQuery}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.code === 0 && json.data) {
      setLogsData(json.data);
    }
  }, []);

  const loadData = useCallback(
    async (p: Period, pg: number, app: AppFilter) => {
      setIsLoading(true);
      try {
        await Promise.all([fetchSummary(p, app), fetchLogs(pg, app)]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSummary, fetchLogs]
  );

  useEffect(() => {
    loadData(period, page, appFilter);
  }, [period, page, appFilter, loadData]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((pg: number) => {
    setPage(pg);
  }, []);

  const handleAppFilterChange = useCallback((app: AppFilter) => {
    setAppFilter(app);
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <MainHeader
          title={t('title')}
          description={t('description')}
        />
        <UsageExportButton data={logsData.data} />
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            onClick={() => handlePeriodChange(p)}
          >
            {t(`period.${p}`)}
          </Button>
        ))}
        <Button
          size="sm"
          variant={appFilter === 'all' ? 'default' : 'outline'}
          onClick={() => handleAppFilterChange('all')}
        >
          {t('app_filter.all')}
        </Button>
        <Button
          size="sm"
          variant={appFilter === 'harvey' ? 'default' : 'outline'}
          onClick={() => handleAppFilterChange('harvey')}
        >
          {t('app_filter.harvey')}
        </Button>
      </div>

      <UsageSummaryCards
        totalRequests={summaryData.summary.totalRequests}
        totalTokens={summaryData.summary.totalTokens}
        totalCost={summaryData.summary.totalCost}
      />

      <UsageChart
        dailyData={summaryData.daily}
        breakdownData={summaryData.breakdown}
      />

      <UsageTable
        data={logsData.data}
        meta={logsData.meta}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
