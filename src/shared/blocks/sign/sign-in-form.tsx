'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, signIn } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAppContext } from '@/shared/contexts/app';

import { SocialProviders } from './social-providers';

export function SignInForm({
  callbackUrl = '/',
  className,
}: {
  callbackUrl: string;
  className?: string;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { configs } = useAppContext();

  const isGoogleAuthEnabled = configs.google_auth_enabled === 'true';
  const isGithubAuthEnabled = configs.github_auth_enabled === 'true';
  const isEmailAuthEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!isGoogleAuthEnabled && !isGithubAuthEnabled); // no social providers enabled, auto enable email auth

  if (callbackUrl) {
    if (
      locale !== defaultLocale &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith(`/${locale}`)
    ) {
      callbackUrl = `/${locale}${callbackUrl}`;
    }
  }

  const handleSignIn = async () => {
    if (loading) {
      return;
    }

    if (!email || !password) {
      toast.error('email and password are required');
      return;
    }

    try {
      setLoading(true);
      await signIn.email(
        {
          email,
          password,
          callbackURL: callbackUrl,
        },
        {
          onRequest: (ctx) => {
            setLoading(true);
          },
          onResponse: (ctx) => {
            setLoading(false);
          },
          onSuccess: (ctx) => {},
          onError: (e: any) => {
            toast.error(e?.error?.message || 'sign in failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      toast.error(e.message || 'sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (sendingOtp) {
      return;
    }

    if (!email) {
      toast.error('email is required');
      return;
    }

    try {
      setSendingOtp(true);
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      });
      toast.success(t('email_verification_sent'));
    } catch (e: any) {
      toast.error(e?.error?.message || 'send verification code failed');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSignIn = async () => {
    if (loading) {
      return;
    }

    if (!email || !otp) {
      toast.error(t('otp_required'));
      return;
    }

    try {
      setLoading(true);
      await signIn.emailOtp(
        {
          email,
          otp,
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: () => {
            setLoading(false);
          },
          onSuccess: () => {},
          onError: (e: any) => {
            toast.error(e?.error?.message || 'sign in failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      toast.error(e.message || 'sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full md:max-w-md ${className}`}>
      <div className="grid gap-4">
        {isEmailAuthEnabled && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('email_title')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('email_placeholder')}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
              />
            </div>

            {!useOtp ? (
              <div className="grid gap-2">
                {/* <div className="flex items-center">
                <Label htmlFor="password">{t("password_title")}</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </Link>
              </div> */}

                <Input
                  id="password"
                  type="password"
                  placeholder={t('password_placeholder')}
                  autoComplete="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="otp">{t('otp_title')}</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder={t('otp_placeholder')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={sendingOtp}
                  onClick={handleSendOtp}
                >
                  {sendingOtp ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <p>{t('send_code')}</p>
                  )}
                </Button>
              </>
            )}

            {/* <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              onClick={() => {
                setRememberMe(!rememberMe);
              }}
            />
            <Label htmlFor="remember">{t("remember_me_title")}</Label>
          </div> */}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              onClick={useOtp ? handleOtpSignIn : handleSignIn}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p>
                  {useOtp ? t('sign_in_with_code') : t('sign_in_title')}
                </p>
              )}
            </Button>

            <Button
              type="button"
              className="w-full"
              variant="ghost"
              onClick={() => {
                setUseOtp((prev) => !prev);
                setOtp('');
              }}
            >
              <p>{useOtp ? t('use_password') : t('use_otp')}</p>
            </Button>
          </>
        )}

        <SocialProviders
          configs={configs}
          callbackUrl={callbackUrl || '/'}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
      {isEmailAuthEnabled && (
        <div className="flex w-full justify-center border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            {t('no_account')}
            <Link href="/sign-up" className="underline">
              <span className="cursor-pointer dark:text-white/70">
                {t('sign_up_title')}
              </span>
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
