'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { ChatGenerator } from '@/shared/blocks/chat/generator';

interface EnterpriseInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface EnterpriseBotsResponse {
  enterprise: EnterpriseInfo;
  bots: unknown[];
}

export default function EnterpriseChat() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EnterpriseBotsResponse | null>(null);

  useEffect(() => {
    fetch(`/api/enterprise/${slug}/bots`)
      .then((res) => {
        if (res.status === 401) throw new Error('Please sign in to access this page.');
        if (res.status === 403) throw new Error('You do not have access to this enterprise workspace. Contact your administrator.');
        if (res.status === 404) throw new Error('Enterprise workspace not found.');
        if (!res.ok) throw new Error('Failed to load enterprise workspace.');
        return res.json();
      })
      .then((json) => {
        if (json.code === 0 && json.data) {
          setData(json.data);
        } else {
          throw new Error(json.message || 'Failed to load enterprise workspace.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Loading enterprise workspace...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm font-medium">{error}</p>
        <a href="/" className="text-primary text-sm underline">
          Go to home
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {data?.enterprise && (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {data.enterprise.logoUrl && (
            <img
              src={data.enterprise.logoUrl}
              alt={data.enterprise.name}
              className="h-7 w-7 rounded object-contain"
            />
          )}
          <span className="text-sm font-semibold">{data.enterprise.name}</span>
          <span className="text-xs text-muted-foreground">Enterprise Workspace</span>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <ChatGenerator />
      </div>
    </div>
  );
}
