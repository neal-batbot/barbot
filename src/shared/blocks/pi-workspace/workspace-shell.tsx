'use client';

import { useEffect, useRef, useState } from 'react';
import type { Agent } from '@mariozechner/pi-agent-core';

import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { BarbotPiSession } from '@/shared/pi-web-ui/barbot-pi-session';

type PiChatPanelElement = HTMLElement & {
  setAgent: (
    agent: Agent,
    options: {
      onApiKeyRequired: () => Promise<boolean>;
      toolsFactory: () => unknown[];
    }
  ) => Promise<void>;
};

type PiWebUiModule = typeof import('@mariozechner/pi-web-ui');

function initPiWebUiStorage(piWebUi: PiWebUiModule) {
  const settings = new piWebUi.SettingsStore();
  const providerKeys = new piWebUi.ProviderKeysStore();
  const sessions = new piWebUi.SessionsStore();
  const customProviders = new piWebUi.CustomProvidersStore();

  const backend = new piWebUi.IndexedDBStorageBackend({
    dbName: 'barbot-pi-web-ui',
    version: 1,
    stores: [
      settings.getConfig(),
      piWebUi.SessionsStore.getMetadataConfig(),
      providerKeys.getConfig(),
      customProviders.getConfig(),
      sessions.getConfig(),
    ],
  });

  settings.setBackend(backend);
  providerKeys.setBackend(backend);
  customProviders.setBackend(backend);
  sessions.setBackend(backend);

  piWebUi.setAppStorage(
    new piWebUi.AppStorage(
      settings,
      providerKeys,
      sessions,
      customProviders,
      backend
    )
  );
}

export function PiWorkspaceShell() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<PiChatPanelElement | null>(null);
  const sessionRef = useRef<BarbotPiSession | null>(null);
  const initedRef = useRef(false);
  const [piReady, setPiReady] = useState(false);

  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  useEffect(() => {
    if (initedRef.current) {
      return;
    }
    let cancelled = false;

    (async () => {
      const piWebUi = await import('@mariozechner/pi-web-ui');
      if (cancelled) {
        return;
      }
      initPiWebUiStorage(piWebUi);
      initedRef.current = true;
      setPiReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || !user || !piReady) {
      return;
    }
    if (panelRef.current) {
      return;
    }

    let disposed = false;
    let panel: PiChatPanelElement | null = null;
    let session: BarbotPiSession | null = null;

    void (async () => {
      await import('@mariozechner/pi-web-ui');
      if (disposed || !mountRef.current) {
        return;
      }

      session = new BarbotPiSession();
      sessionRef.current = session;

      panel = document.createElement('pi-chat-panel') as PiChatPanelElement;
      panel.style.height = '100%';
      panel.style.width = '100%';
      mountRef.current.appendChild(panel);
      panelRef.current = panel;

      await panel.setAgent(session as unknown as Agent, {
        onApiKeyRequired: async () => true,
        toolsFactory: () => [],
      });
    })();

    return () => {
      disposed = true;
      sessionRef.current = null;
      panelRef.current = null;
      if (panel && mountNode.contains(panel)) {
        mountNode.removeChild(panel);
      }
    };
  }, [user, piReady]);

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
          <h2 className="text-xl font-semibold">Sign in to use Pi Web-UI</h2>
          <p className="text-sm text-muted-foreground">
            Your Barbot account session is used directly in this workspace.
          </p>
          <Button onClick={() => setIsShowSignModal(true)}>Sign In</Button>
          <SignModal callbackUrl="/workspace" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] min-h-[640px] w-full">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
