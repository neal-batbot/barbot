import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import { LocaleDetector } from '@/shared/blocks/common';
import { getChatUiMode } from '@/shared/lib/chat-ui-mode';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // load page data
  const t = await getTranslations('landing');

  // load layout component
  const Layout = await getThemeLayout('landing');

  // header and footer to display
  const header: HeaderType = t.raw('header');
  const footer: FooterType = t.raw('footer');
  const chatRoute = getChatUiMode() === 'legacy' ? '/chat-legacy' : '/pi-agent';

  if (header.nav?.items?.length) {
    header.nav.items = header.nav.items.map((item) => {
      const mapped = { ...item };
      if (mapped.url === '/chat') {
        mapped.url = chatRoute;
      }
      if (mapped.children?.length) {
        mapped.children = mapped.children.map((child) => ({
          ...child,
          url: child.url === '/chat' ? chatRoute : child.url,
        }));
      }
      return mapped;
    });
  }

  return (
    <div className="min-h-screen">
      <Layout header={header} footer={footer}>
        <LocaleDetector />
        {children}
      </Layout>
    </div>
  );
}
