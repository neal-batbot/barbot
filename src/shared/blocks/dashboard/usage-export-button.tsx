'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface UsageRow {
  id: string;
  product: string;
  model?: string | null;
  type: string;
  tokens?: number | null;
  cost?: string | null;
  status?: string | null;
  createdAt: string | Date;
}

interface UsageExportButtonProps {
  data: UsageRow[];
}

function formatDate(d: string | Date): string {
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

export function UsageExportButton({ data }: UsageExportButtonProps) {
  const t = useTranslations('dashboard.usage');

  const handleExport = useCallback(() => {
    const headers = ['ID', 'Product', 'Model', 'Type', 'Tokens', 'Cost', 'Status', 'Date'];
    const rows = data.map((row) => [
      row.id,
      row.product,
      row.model ?? '',
      row.type,
      String(row.tokens ?? 0),
      row.cost ?? '0',
      row.status ?? '',
      formatDate(row.createdAt),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${t('export.filename')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, t]);

  return (
    <Button size="sm" variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {t('export.button')}
    </Button>
  );
}
