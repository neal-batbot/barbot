'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, signUp } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { ExtensionAuthRedirect } from './extension-auth-redirect';
import { SocialProviders } from './social-providers';

export function SignUp({
  configs,
  callbackUrl = '/',
  state,
  redirectUri,
}: {
  configs: Record<string, string>;
  callbackUrl: string;
  state?: string;
  redirectUri?: string;
}) {
  const router = useRouter();
  const t = useTranslations('common.sign');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const isGoogleAuthEnabled = configs.google_auth_enabled === 'true';
  const isGithubAuthEnabled = configs.github_auth_enabled === 'true';
  const isEmailAuthEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!isGoogleAuthEnabled && !isGithubAuthEnabled); // no social providers enabled, auto enable email auth

  const authQuery =
    state && redirectUri
      ? `?state=${encodeURIComponent(state)}&redirectUri=${encodeURIComponent(
          redirectUri
        )}`
      : '';

  if (callbackUrl) {
    const locale = useLocale();
    if (
      locale !== defaultLocale &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith(`/${locale}`)
    ) {
      callbackUrl = `/${locale}${callbackUrl}`;
    }
  }

  const reportAffiliate = ({
    userEmail,
    stripeCustomerId,
  }: {
    userEmail: string;
    stripeCustomerId?: string;
  }) => {
    if (typeof window === 'undefined' || !configs) {
      return;
    }

    const windowObject = window as any;

    if (configs.affonso_enabled === 'true' && windowObject.Affonso) {
      windowObject.Affonso.signup(userEmail);
    }

    if (configs.promotekit_enabled === 'true' && windowObject.promotekit) {
      windowObject.promotekit.refer(userEmail, stripeCustomerId);
    }
  };

  const handleSignUp = async () => {
    if (loading) {
      return;
    }

    if (!email || !password || !name) {
      toast.error('email, password and name are required');
      return;
    }

    await signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onRequest: (ctx) => {
          setLoading(true);
        },
        onResponse: (ctx) => {
          setLoading(false);
        },
        onSuccess: (ctx) => {
          reportAffiliate({ userEmail: email });
        },
        onError: (e: any) => {
          toast.error(e?.error?.message || 'sign up failed');
          setLoading(false);
        },
      }
    );

    try {
      setSendingOtp(true);
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
      setStep('verify');
      toast.success(t('email_verification_sent'));
    } catch (e: any) {
      toast.error(e?.error?.message || 'send verification code failed');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!otp) {
      toast.error(t('otp_required'));
      return;
    }

    try {
      setLoading(true);
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (result?.error) {
        throw new Error(result.error.message || 'verify email failed');
      }

      toast.success(t('email_verified'));
      router.push(callbackUrl);
    } catch (e: any) {
      toast.error(e?.message || 'verify email failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (sendingOtp) {
      return;
    }

    try {
      setSendingOtp(true);
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
      toast.success(t('email_verification_sent'));
    } catch (e: any) {
      toast.error(e?.error?.message || 'send verification code failed');
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <ExtensionAuthRedirect state={state} redirectUri={redirectUri} />
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          <h1>
            {step === 'form' ? t('sign_up_title') : t('email_verify_title')}
          </h1>
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          <h2>
            {step === 'form'
              ? t('sign_up_description')
              : t('email_verify_description')}
          </h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {isEmailAuthEnabled && (
            <>
              {step === 'form' ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t('name_title')}</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('name_placeholder')}
                      required
                      onChange={(e) => {
                        setName(e.target.value);
                      }}
                      value={name}
                    />
                  </div>

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

                  <div className="grid gap-2">
                    <Label htmlFor="password">{t('password_title')}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('password_placeholder')}
                      autoComplete="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || sendingOtp}
                    onClick={handleSignUp}
                  >
                    {loading || sendingOtp ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <p>{t('sign_up_title')}</p>
                    )}
                  </Button>
                </>
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
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                    onClick={handleVerifyEmail}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <p>{t('verify_email_action')}</p>
                    )}
                  </Button>

                  <Button
                    type="button"
                    className="w-full"
                    variant="ghost"
                    disabled={sendingOtp}
                    onClick={handleResendOtp}
                  >
                    {sendingOtp ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <p>{t('resend_code')}</p>
                    )}
                  </Button>
                </>
              )}
            </>
          )}

          <SocialProviders
            configs={configs}
            callbackUrl={callbackUrl || '/'}
            loading={loading}
            setLoading={setLoading}
            onBeforeSignIn={() => {}}
          />
        </div>
      </CardContent>
      {isEmailAuthEnabled && step === 'form' && (
        <CardFooter>
          <div className="flex w-full justify-center border-t py-4">
            <p className="text-center text-xs text-neutral-500">
              {t('already_have_account')}
              <Link href={`/sign-in${authQuery}`} className="underline">
                <span className="cursor-pointer dark:text-white/70">
                  {t('sign_in_title')}
                </span>
              </Link>
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
