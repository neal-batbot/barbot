'use client';

import dynamic from 'next/dynamic';

const PiWorkspaceShell = dynamic(
  () =>
    import('@/shared/blocks/pi-workspace/workspace-shell').then(
      (mod) => mod.PiWorkspaceShell
    ),
  {
    ssr: false,
  }
);

export function PiChatEntry() {
  return <PiWorkspaceShell />;
}

