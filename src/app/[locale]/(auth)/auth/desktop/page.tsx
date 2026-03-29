import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuth } from '@/core/auth';
import { createDesktopAuthCode } from '@/shared/models/desktop-auth';

export default async function DesktopAuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    auto?: string;
    callback?: string;
    protocol?: string;
  }>;
}) {
  const { callback, protocol } = await searchParams;

  // Get current session from better-auth
  const auth = await getAuth();
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    // Not logged in — redirect to sign-in with return URL
    const currentUrl = `/auth/desktop?${new URLSearchParams({
      auto: 'true',
      ...(callback ? { callback } : {}),
      ...(protocol ? { protocol } : {}),
    }).toString()}`;
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(currentUrl)}`);
  }

  // User is logged in — generate auth code
  const code = await createDesktopAuthCode(session.user.id);

  // Determine callback URL
  if (callback) {
    // HTTP callback (dev mode)
    const redirectUrl = `${callback}?code=${encodeURIComponent(code)}`;
    redirect(redirectUrl);
  }

  if (protocol) {
    // Deep link callback (production)
    const deepLink = `${protocol}://auth/callback?code=${encodeURIComponent(code)}`;
    redirect(deepLink);
  }

  // Fallback: show the code for manual entry
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Desktop Authorization</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Copy this code back to Harvey to complete authorization.
      </p>
      <code className="bg-muted rounded-lg px-6 py-3 text-lg font-mono tracking-wider select-all">
        {code}
      </code>
      <p className="text-sm text-muted-foreground">
        This code expires in 5 minutes.
      </p>
    </div>
  );
}
