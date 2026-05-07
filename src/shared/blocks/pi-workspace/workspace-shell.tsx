'use client';

import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';

export function PiWorkspaceShell() {
  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  if (isCheckSign) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">Sign in to use workspace</h2>
          <p className="text-sm text-muted-foreground">
            This feature is temporarily unavailable in the current deployment target.
          </p>
          <Button onClick={() => setIsShowSignModal(true)}>Sign In</Button>
          <SignModal callbackUrl="/chat" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="space-y-3 text-center">
        <h2 className="text-xl font-semibold">Workspace is temporarily disabled</h2>
        <p className="text-sm text-muted-foreground">
          We are upgrading compatibility for this module. Please use the main chat page for now.
        </p>
      </div>
    </div>
  );
}
