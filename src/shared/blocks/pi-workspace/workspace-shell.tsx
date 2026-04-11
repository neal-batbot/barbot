'use client';

import { useEffect, useRef } from 'react';
import type { Agent } from '@mariozechner/pi-agent-core';
import {
  AppStorage,
  ChatPanel,
  CustomProvidersStore,
  IndexedDBStorageBackend,
  ProviderKeysStore,
  SessionsStore,
  SettingsStore,
  setAppStorage,
} from '@mariozechner/pi-web-ui';

import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { BarbotPiSession } from '@/shared/pi-web-ui/barbot-pi-session';

function initPiWebUiStorage() {
  const settings = new SettingsStore();
  const providerKeys = new ProviderKeysStore();
  const sessions = new SessionsStore();
  const customProviders = new CustomProvidersStore();

  const backend = new IndexedDBStorageBackend({
    dbName: 'barbot-pi-web-ui',
    version: 1,
    stores: [
      settings.getConfig(),
      SessionsStore.getMetadataConfig(),
      providerKeys.getConfig(),
      customProviders.getConfig(),
      sessions.getConfig(),
    ],
  });

  settings.setBackend(backend);
  providerKeys.setBackend(backend);
  customProviders.setBackend(backend);
  sessions.setBackend(backend);

  setAppStorage(
    new AppStorage(settings, providerKeys, sessions, customProviders, backend)
  );
}

export function PiWorkspaceShell() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<ChatPanel | null>(null);
  const sessionRef = useRef<BarbotPiSession | null>(null);
  const initedRef = useRef(false);

  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  useEffect(() => {
    if (initedRef.current) {
      return;
    }
    initPiWebUiStorage();
    initedRef.current = true;
  }, []);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || !user) {
      return;
    }
    if (panelRef.current) {
      return;
    }

    const session = new BarbotPiSession();
    sessionRef.current = session;

    const panel = document.createElement('pi-chat-panel') as ChatPanel;
    panel.style.height = '100%';
    panel.style.width = '100%';
    mountNode.appendChild(panel);
    panelRef.current = panel;

    void panel.setAgent(session as unknown as Agent, {
      onApiKeyRequired: async () => true,
      toolsFactory: () => [],
    });

    return () => {
      sessionRef.current = null;
      panelRef.current = null;
      if (mountNode.contains(panel)) {
        mountNode.removeChild(panel);
      }
    };
  }, [user]);

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
