'use client';

import { useTranslations } from 'next-intl';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
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

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsageTableProps {
  data: UsageRow[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleString();
}

export function UsageTable({ data, meta, onPageChange }: UsageTableProps) {
  const t = useTranslations('dashboard.usage');

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.product')}</TableHead>
              <TableHead>{t('table.model')}</TableHead>
              <TableHead>{t('table.type')}</TableHead>
              <TableHead className="text-right">{t('table.tokens')}</TableHead>
              <TableHead className="text-right">{t('table.cost')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t('table.empty')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.product}</TableCell>
                  <TableCell>{row.model ?? '—'}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="text-right">{(row.tokens ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">${row.cost ?? '0'}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'success' ? 'default' : 'destructive'}>
                      {row.status ?? 'success'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {meta.total} {t('pagination.of')} {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              {t('pagination.prev')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange(meta.page + 1)}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
