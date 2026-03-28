import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export default async function DashboardSettingsPage() {
  const locale = await getLocale();
  redirect(`/${locale}/settings`);
}
