import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getUserInfo } from '@/shared/models/user';
import { DashboardLayout } from '@/shared/blocks/dashboard/layout';
import { Header } from '@/shared/blocks/dashboard/header';
import { Sidebar } from '@/shared/types/blocks/dashboard';

export default async function DashboardRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('dashboard');

  const user = await getUserInfo();

  const sidebar: Sidebar = {
    variant: 'inset',
    collapsible: 'icon',
    header: {
      brand: {
        title: t('sidebar.title'),
        logo: {
          src: '/logo/harvey-icon.svg',
          alt: t('sidebar.title'),
        },
        url: '/dashboard',
      },
      show_trigger: true,
    },
    main_navs: [
      {
        id: 'main',
        items: [
          {
            title: t('overview.title'),
            url: '/dashboard',
            icon: 'LayoutDashboard',
          },
          {
            title: t('usage.title'),
            url: '/dashboard/usage',
            icon: 'BarChart2',
          },
          {
            title: t('billing.title'),
            url: '/dashboard/billing',
            icon: 'CreditCard',
          },
        ],
      },
      {
        id: 'account',
        title: t('settings.title'),
        items: [
          {
            title: t('settings.tabs.profile'),
            url: '/settings/profile',
            icon: 'User',
          },
          {
            title: t('settings.tabs.api_keys'),
            url: '/settings/apikeys',
            icon: 'Key',
          },
          {
            title: 'Credits',
            url: '/settings/credits',
            icon: 'Coins',
          },
        ],
      },
    ],
    user: {
      show_email: true,
      show_signout: true,
      signout_callback: '/',
      signin_callback: '/dashboard',
    },
  };

  return (
    <DashboardLayout sidebar={sidebar}>
      <Header show_theme show_locale />
      {children}
    </DashboardLayout>
  );
}
