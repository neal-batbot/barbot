import { getTranslations } from 'next-intl/server';

import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getRemainingCredits } from '@/shared/models/credit';
import { Empty } from '@/shared/blocks/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { MainHeader } from '@/shared/blocks/dashboard/main-header';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const [subscription, remainingCredits] = await Promise.all([
    getCurrentSubscription(user.id),
    getRemainingCredits(user.id),
  ]);

  const planName = subscription?.planName ?? t('overview.subscription.free');
  const planStatus = subscription?.status ?? 'free';

  const statusBadgeMap: Record<string, string> = {
    active: t('overview.subscription.badge_active'),
    trialing: t('overview.subscription.badge_trial'),
    pending_cancel: t('overview.subscription.badge_active'),
    canceled: t('overview.subscription.badge_canceled'),
    free: t('overview.subscription.free'),
  };

  const badgeLabel = statusBadgeMap[planStatus] ?? planStatus;

  return (
    <div className="flex flex-col gap-6 p-6">
      <MainHeader
        title={t('overview.title')}
        description={t('overview.description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.subscription.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-bold">{planName}</span>
            <Badge variant={planStatus === 'active' || planStatus === 'trialing' ? 'default' : 'secondary'}>
              {badgeLabel}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.credits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{remainingCredits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('overview.credits.balance')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.usage.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-1">{t('overview.usage.requests')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('overview.recent.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            {t('overview.recent.empty')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
