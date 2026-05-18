import { getTranslations } from 'next-intl/server';
import { Coins } from 'lucide-react';

import { Empty } from '@/shared/blocks/common';
import { Link } from '@/core/i18n/navigation';
import { TableCard } from '@/shared/blocks/table';
import {
  Credit,
  CreditStatus,
  CreditTransactionType,
  getCredits,
  getCreditsCount,
  getRemainingCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.credits');

  const total = await getCreditsCount({
    transactionType: type as CreditTransactionType,
    userId: user.id,
    status: CreditStatus.ACTIVE,
  });

  const credits = await getCredits({
    userId: user.id,
    status: CreditStatus.ACTIVE,
    transactionType: type as CreditTransactionType,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'description', title: t('fields.description') },
      {
        name: 'transactionType',
        title: t('fields.type'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'transactionScene',
        title: t('fields.scene'),
        type: 'label',
        placeholder: '-',
        metadata: { variant: 'outline' },
      },
      {
        name: 'credits',
        title: t('fields.credits'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'expiresAt',
        title: t('fields.expires_at'),
        type: 'time',
        placeholder: '-',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
    ],
    data: credits,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const remainingCredits = await getRemainingCredits(user.id);

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/credits',
      is_active: !type || type === 'all',
    },
    {
      title: t('list.tabs.grant'),
      name: 'grant',
      url: '/settings/credits?type=grant',
      is_active: type === 'grant',
    },
    {
      title: t('list.tabs.consume'),
      name: 'consume',
      url: '/settings/credits?type=consume',
      is_active: type === 'consume',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-3xl overflow-hidden rounded-2xl border border-fd-border bg-fd-card text-fd-card-foreground shadow-lg">
        <div className="flex flex-col gap-8 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-fd-secondary text-fd-secondary-foreground">
                <Coins size={18} />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t('view.title')}
                </h2>
                <p className="mt-1 text-sm text-fd-muted-foreground">
                  {t('view.description')}
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-semibold tracking-normal text-fd-foreground">
                {remainingCredits.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-fd-muted-foreground">
                {t('fields.credits')}
              </span>
            </div>
          </div>

          <Link
            href="/pricing"
            target="_blank"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand/70 bg-brand px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-200"
          >
            <Coins size={16} />
            {t('view.buttons.purchase')}
          </Link>
        </div>
      </section>
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
