import { ReactNode } from 'react';

import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';
import { Footer, Header } from '@/themes/default/blocks';

export default async function LandingLayout({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header header={header} />
      <main className="flex-1 border-y border-border/85 py-6">{children}</main>
      <Footer footer={footer} />
    </div>
  );
}
