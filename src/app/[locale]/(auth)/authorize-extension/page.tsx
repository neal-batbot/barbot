import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { AuthorizeExtension } from '@/shared/blocks/sign/authorize-extension';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return {
    title: `${t('sign.authorize_title')} - ${t('metadata.title')}`,
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/authorize-extension`
          : `${envConfigs.app_url}/authorize-extension`,
    },
  };
}

export default async function AuthorizeExtensionPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    redirectUri?: string;
    audience?: string;
  }>;
}) {
  const { state, redirectUri, audience } = await searchParams;

  return (
    <AuthorizeExtension
      state={state}
      redirectUri={redirectUri}
      audience={audience}
    />
  );
}
