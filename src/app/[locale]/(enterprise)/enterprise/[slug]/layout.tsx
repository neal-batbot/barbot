'use client';

import { ReactNode } from 'react';

import { ChatContextProvider } from '@/shared/contexts/chat';

export default function EnterpriseLayout({ children }: { children: ReactNode }) {
  return <ChatContextProvider>{children}</ChatContextProvider>;
}
