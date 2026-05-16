'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { isAllowedBridgeAudience, VSCODE_AUDIENCE } from '@/shared/lib/auth-bridge';
import {
  resolveProductFromAudience,
  type PlatformAudience,
} from '@/shared/lib/platform-config';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

type TokenResponse = {
  token: string;
  audience?: string;
  error?: string;
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
};

const ALLOWED_REDIRECT_SCHEMES = ['vscode', 'vscode-insiders', 'vscode-oss'];

function getAudienceCopy(audience: string) {
  switch (audience) {
    case 'vector-web-ui':
      return {
        appName: 'Pi Agent Web UI',
        titleZh: '授权 Pi Agent Web UI',
        descriptionZh: 'Pi Agent Web UI 正在请求访问您的 Barbot 账户。',
        scopeZh:
          '这将允许 Pi Agent Web UI 读取您的账户信息、套餐权益和剩余额度，用于本地 Web 聊天体验。',
        titleEn: 'Authorize Pi Agent Web UI',
        descriptionEn:
          'Pi Agent Web UI is requesting access to your Barbot account.',
        scopeEn:
          'This allows Pi Agent Web UI to read your account, plan, and quota information for the local web chat experience.',
        successSuffix: '',
      };
    case 'fumadocs-web':
      return {
        appName: 'Fumadocs',
        titleZh: '授权 Fumadocs',
        descriptionZh: 'Fumadocs 正在请求访问您的 Barbot 账户。',
        scopeZh:
          '这将允许 Fumadocs 读取您的账户权益，用于 AI 搜索、MCP 和 EPUB 导出等高级功能。',
        titleEn: 'Authorize Fumadocs',
        descriptionEn: 'Fumadocs is requesting access to your Barbot account.',
        scopeEn:
          'This allows Fumadocs to read your account entitlements for premium features such as AI search, MCP, and EPUB export.',
        successSuffix: '',
      };
    case 'supabase-ssh-web':
    case 'supabase-ssh-ssh':
      return {
        appName: 'Supabase SSH',
        titleZh: '授权 Supabase SSH',
        descriptionZh: 'Supabase SSH 正在请求访问您的 Barbot 账户。',
        scopeZh:
          '这将允许 Supabase SSH 校验您的账户权益并启用 SSH 访问能力。',
        titleEn: 'Authorize Supabase SSH',
        descriptionEn:
          'Supabase SSH is requesting access to your Barbot account.',
        scopeEn:
          'This allows Supabase SSH to check your account entitlements and enable SSH access.',
        successSuffix: '',
      };
    case 'vector-vscode':
    default:
      return {
        appName: 'Vector VS Code',
        titleZh: '授权 Vector VS Code 扩展',
        descriptionZh: 'Vector VS Code 扩展正在请求访问您的账户。',
        scopeZh:
          '这将允许 Vector VS Code 扩展访问您的账户信息并代表您使用 API 积分。',
        titleEn: 'Authorize Vector for VS Code',
        descriptionEn:
          'The Vector extension is requesting access to your account.',
        scopeEn:
          'This will allow the Vector VS Code extension to access your account information and use API credits on your behalf.',
        successSuffix: 'vscode',
      };
  }
}

function useAudienceCopy(audience: string) {
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'zh'
      ? 'zh'
      : 'en';
  const copy = getAudienceCopy(audience);
  return {
    appName: copy.appName,
    title: locale === 'zh' ? copy.titleZh : copy.titleEn,
    description: locale === 'zh' ? copy.descriptionZh : copy.descriptionEn,
    scope: locale === 'zh' ? copy.scopeZh : copy.scopeEn,
    successSuffix: copy.successSuffix,
  };
}

function isAllowedRedirectUri(redirectUri: string, audience: string) {
  try {
    const parsed = new URL(redirectUri);
    const protocol = parsed.protocol.replace(':', '');
    if (ALLOWED_REDIRECT_SCHEMES.includes(protocol)) {
      return true;
    }

    const product = resolveProductFromAudience(audience as PlatformAudience);
    if (!product) {
      return false;
    }

    if (
      (protocol === 'https' || protocol === 'http') &&
      ['pi-web-ui', 'fumadocs', 'supabase-ssh'].includes(product)
    ) {
      return (
        protocol === 'https' ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      );
    }

    return false;
  } catch {
    return false;
  }
}

export function AuthorizeExtension({
  state,
  redirectUri,
  audience,
}: {
  state?: string;
  redirectUri?: string;
  audience?: string;
}) {
  const { data: session, isPending } = useSession();
  const t = useTranslations('common.sign');
  const router = useRouter();
  const [authorizing, setAuthorizing] = useState(false);
  const redirectedRef = useRef(false);
  const resolvedAudience: string = isAllowedBridgeAudience(audience)
    ? audience!
    : VSCODE_AUDIENCE;
  const audienceCopy = useAudienceCopy(resolvedAudience);

  useEffect(() => {
    if (redirectedRef.current || isPending) return;

    if (!state || !redirectUri || !isAllowedBridgeAudience(resolvedAudience)) {
      router.replace('/');
      return;
    }

    if (!session?.user) {
      redirectedRef.current = true;
      const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(
        `/authorize-extension?state=${encodeURIComponent(state)}&redirectUri=${encodeURIComponent(redirectUri)}&audience=${encodeURIComponent(resolvedAudience)}`
      )}`;
      router.replace(signInUrl);
    }
  }, [isPending, redirectUri, resolvedAudience, router, session?.user, state]);

  const handleAuthorize = async () => {
    if (!state || !redirectUri) return;

    if (!isAllowedRedirectUri(redirectUri, resolvedAudience)) {
      toast.error(t('authorize_invalid_redirect'));
      return;
    }

    setAuthorizing(true);
    try {
      const resp = await fetch(
        `/api/extension/token?aud=${encodeURIComponent(resolvedAudience)}`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        }
      );

      if (!resp.ok) {
        const payload = (await resp.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        const errorDetail =
          payload?.error || payload?.message || `http_${resp.status}`;
        toast.error(`${t('authorize_token_failed')} (${errorDetail})`);
        return;
      }

      const data = (await resp.json()) as TokenResponse;
      if (!data.token) {
        toast.error(t('authorize_token_missing'));
        return;
      }

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('token', data.token);
      redirectUrl.searchParams.set('audience', data.audience || resolvedAudience);
      redirectUrl.searchParams.set('state', state);
      if (data.user?.id) {
        redirectUrl.searchParams.set('userId', data.user.id);
      }
      const userLabel = data.user?.name || data.user?.email;
      if (userLabel) {
        redirectUrl.searchParams.set('userLabel', userLabel);
      }

      toast.success(
        audienceCopy.successSuffix === 'vscode'
          ? `${t('extension_login_success')} ${t('extension_open_vscode')}`
          : t('extension_login_success')
      );

      const link = document.createElement('a');
      link.href = redirectUrl.toString();
      link.style.display = 'none';
      link.setAttribute('target', '_self');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        } catch {
          // ignore
        }
      }, 1000);
    } catch {
      toast.error(t('authorize_unexpected_error'));
    } finally {
      setAuthorizing(false);
    }
  };

  const handleSwitchAccount = () => {
    if (!state || !redirectUri) return;
    const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(
      `/authorize-extension?state=${encodeURIComponent(state)}&redirectUri=${encodeURIComponent(redirectUri)}&audience=${encodeURIComponent(resolvedAudience)}`
    )}`;
    router.push(signInUrl);
  };

  if (isPending || !session?.user) {
    return (
      <Card className="mx-auto w-full md:max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const user = session.user;

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-lg md:text-xl">
          <h1>{audienceCopy.title}</h1>
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          <h2>{audienceCopy.description}</h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-16 w-16">
              {user.image && (
                <AvatarImage src={user.image} alt={user.name || ''} />
              )}
              <AvatarFallback className="text-lg">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              {user.name && (
                <p className="font-medium">{user.name}</p>
              )}
              {user.email && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>

          <div className="w-full rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            {audienceCopy.scope}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={authorizing}
            onClick={handleAuthorize}
          >
            {authorizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('authorize_action')
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-center border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            {t('authorize_switch_account_hint')}{' '}
            <button
              onClick={handleSwitchAccount}
              className="cursor-pointer underline dark:text-white/70"
            >
              {t('authorize_switch_account')}
            </button>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
