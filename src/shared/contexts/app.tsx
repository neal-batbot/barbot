'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getAuthClient, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  isIgnorableClientErrorMessage,
  reportClientError,
} from '@/shared/lib/client-error';
import { User } from '@/shared/models/user';

export interface ContextValue {
  user: User | null;
  isCheckSign: boolean;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [configs, setConfigs] = useState<Record<string, string>>({});

  // sign user
  const [user, setUser] = useState<User | null>(null);

  // session
  const { data: session, isPending } = useSession();

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  const fetchConfigs = async function () {
    try {
      const resp = await fetch('/api/config');
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('fetch configs failed:', error);
      void reportClientError({
        source: 'app-context.fetchConfigs',
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        href: window.location.href,
        userAgent: window.navigator.userAgent,
      });
    }
  };

  const fetchUserCredits = async function () {
    try {
      if (!user) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser({ ...user, credits: data });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('fetch user credits failed:', error);
      void reportClientError({
        source: 'app-context.fetchUserCredits',
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        href: window.location.href,
        userAgent: window.navigator.userAgent,
      });
    }
  };

  const fetchUserInfo = async function () {
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('fetch user info failed:', error);
      void reportClientError({
        source: 'app-context.fetchUserInfo',
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        href: window.location.href,
        userAgent: window.navigator.userAgent,
      });
    }
  };

  const showOneTap = async function (configs: Record<string, string>) {
    try {
      const authClient = getAuthClient(configs);
      await authClient.oneTap({
        callbackURL: '/',
        onPromptNotification: (notification: any) => {
          // Handle prompt dismissal silently
          // This callback is triggered when the prompt is dismissed or skipped
          console.log('One Tap prompt notification:', notification);
        },
        // fetchOptions: {
        //   onSuccess: () => {
        //     router.push('/');
        //   },
        // },
      });
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors occur when users close the prompt or decline to sign in
      // Common errors: FedCM NetworkError, AbortError, etc.
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    const sessionUser = session?.user;
    const currentUserId = user?.id;
    const sessionUserId = sessionUser?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as User);
      fetchUserInfo();
    } else if (!sessionUser && currentUserId) {
      setUser(null);
    }
  }, [session?.user?.id]);

  // one tap initialized
  const oneTapInitialized = useRef(false);

  useEffect(() => {
    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending &&
      !oneTapInitialized.current
    ) {
      oneTapInitialized.current = true;
      showOneTap(configs);
    }
  }, [configs, session, isPending]);

  useEffect(() => {
    if (user && !user.credits) {
      // fetchUserCredits();
    }
  }, [user]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message =
        typeof event.message === 'string' && event.message.length > 0
          ? event.message
          : 'Unknown window error';
      if (isIgnorableClientErrorMessage(message)) {
        return;
      }
      void reportClientError({
        source: 'window.onerror',
        message,
        stack:
          event.error instanceof Error
            ? event.error.stack
            : event.filename
              ? `${event.filename}:${event.lineno}:${event.colno}`
              : undefined,
        route: window.location.pathname,
        href: window.location.href,
        userAgent: window.navigator.userAgent,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      if (isIgnorableClientErrorMessage(error.message)) {
        return;
      }
      void reportClientError({
        source: 'window.unhandledrejection',
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        href: window.location.href,
        userAgent: window.navigator.userAgent,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  return (
    <AppContext.Provider
      value={{
        user,
        isCheckSign,
        isShowSignModal,
        setIsShowSignModal,
        isShowPaymentModal,
        setIsShowPaymentModal,
        configs,
        fetchUserCredits,
        fetchUserInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
