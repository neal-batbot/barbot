'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

import {
  isIgnorableClientErrorMessage,
  reportClientError,
} from '@/shared/lib/client-error';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown client render error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isIgnorableClientErrorMessage(error?.message)) {
      return;
    }

    const payload = {
      source: 'react-error-boundary',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      href: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    };

    console.error('Uncaught error:', payload);
    void reportClientError(payload);
  }

  public render() {
    if (this.state.hasError) {
      if (isIgnorableClientErrorMessage(this.state.errorMessage)) {
        return (
          <div className="flex h-screen flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-normal">Page not found</h1>
            <a
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
            >
              Back to Home
            </a>
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="bg-background flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
          {this.state.errorMessage ? (
            <p className="text-muted-foreground max-w-xl text-xs break-all">
              {this.state.errorMessage}
            </p>
          ) : null}
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
