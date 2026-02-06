import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { SignUp } from '@/shared/blocks/sign/sign-up';
import { getConfigs } from '@/shared/models/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations('common');

  return {
    title: `${t('sign.sign_up_title')} - ${t('metadata.title')}`,
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/sign-up`
          : `${envConfigs.app_url}/sign-up`,
    },
  };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    state?: string;
    redirectUri?: string;
  }>;
}) {
  const { callbackUrl, state, redirectUri } = await searchParams;

  const configs = await getConfigs();

  const continueCallbackUrl =
    state && redirectUri
      ? `/sign-up?state=${encodeURIComponent(
          state
        )}&redirectUri=${encodeURIComponent(redirectUri)}`
      : undefined;

  return (
    <SignUp
      configs={configs}
      callbackUrl={callbackUrl || continueCallbackUrl || '/'}
      state={state}
      redirectUri={redirectUri}
    />
  );
}
