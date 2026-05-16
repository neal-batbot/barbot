import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import { getThemePage } from '@/core/theme';
import { getChatUiMode } from '@/shared/lib/chat-ui-mode';
import { DynamicPage, Section } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Redirect authenticated users to chat
  try {
    const auth = await getAuth();
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (session?.user) {
      redirect(getChatUiMode() === 'legacy' ? '/chat-legacy' : '/pi-agent');
    }
  } catch {
    // Continue to landing page if auth check fails
  }

  const t = await getTranslations('landing');

  const showSections = [
    'hero',
    'logos',
    'introduce',
    'benefits',
    'usage',
    'features',
    'stats',
    'testimonials',
    'subscribe',
    'faq',
    'cta',
  ];

  const page: DynamicPage = {
    sections: showSections.reduce<Record<string, Section>>((acc, section) => {
      const sectionData = t.raw(section) as Section;
      if (sectionData) {
        acc[section] = sectionData;
      }
      return acc;
    }, {}),
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
