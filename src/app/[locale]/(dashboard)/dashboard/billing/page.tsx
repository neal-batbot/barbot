import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common';
import { MainHeader } from '@/shared/blocks/dashboard/main-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { getOrders, OrderStatus } from '@/shared/models/order';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUsageLogs, getUsageSummary } from '@/shared/models/usage-log';
import { getUserInfo } from '@/shared/models/user';
import { parseUsageSupplyMetadata } from '@/shared/services/model-supply-ui';

export default async function DashboardBillingPage() {
  const t = await getTranslations('dashboard.billing');

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const [subscription, orders, usage, recentUsage] = await Promise.all([
    getCurrentSubscription(user.id),
    getOrders({
      userId: user.id,
      status: OrderStatus.PAID,
      page: 1,
      limit: 10,
    }),
    getUsageSummary({
      userId: user.id,
      startDate,
      endDate,
      groupBy: 'product',
    }),
    getUsageLogs({
      userId: user.id,
      product: 'chat',
      startDate,
      endDate,
      page: 1,
      limit: 10,
    }),
  ]);

  const formatDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : '—';

  const formatAmount = (
    amount: number | null | undefined,
    currency: string | null | undefined
  ) => {
    if (!amount) return '—';
    return `${(amount / 100).toFixed(2)} ${(currency ?? 'USD').toUpperCase()}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <MainHeader title={t('title')} description={t('description')} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">{t('plan.title')}</CardTitle>
          {subscription ? (
            <Link href="/settings/billing">
              <Button size="sm" variant="outline">
                {t('plan.manage')}
              </Button>
            </Link>
          ) : (
            <Link href="/pricing">
              <Button size="sm">{t('plan.upgrade')}</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold">
                  {subscription.planName ?? 'Plan'}
                </span>
                <Badge>{subscription.status}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('plan.renews_at')}:{' '}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{t('plan.free')}</span>
              <Badge variant="secondary">Free</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model spend</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsage.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-6 text-center"
                  >
                    {t('invoices.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                recentUsage.data.map((item) => {
                  const supply = parseUsageSupplyMetadata(item.metadata);
                  const actualModel =
                    supply.actualModel || supply.selectedModel || item.model;
                  const actualProvider =
                    supply.actualProvider ||
                    supply.selectedProvider ||
                    item.provider;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {supply.requestedModel || item.model || '—'}
                      </TableCell>
                      <TableCell>{actualModel || '—'}</TableCell>
                      <TableCell>{actualProvider || '—'}</TableCell>
                      <TableCell>{supply.usageType || item.type}</TableCell>
                      <TableCell className="text-right">
                        {(item.tokens ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.cost ?? '0'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('included_usage.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('included_usage.item')}</TableHead>
                <TableHead className="text-right">
                  {t('included_usage.tokens')}
                </TableHead>
                <TableHead className="text-right">
                  {t('included_usage.usage')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.breakdown.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground py-6 text-center"
                  >
                    {t('invoices.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                usage.breakdown.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>{item.key}</TableCell>
                    <TableCell className="text-right">
                      {item.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.requests.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('invoices.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t('invoices.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.date')}</TableHead>
                  <TableHead className="text-right">
                    {t('invoices.amount')}
                  </TableHead>
                  <TableHead>{t('invoices.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{formatDate(o.paidAt ?? o.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(
                        o.paymentAmount ?? o.amount,
                        o.paymentCurrency ?? o.currency
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{t('invoices.paid')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/settings/billing">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1"
          >
            {t('plan.manage')} →
          </Button>
        </Link>
      </div>
    </div>
  );
}
