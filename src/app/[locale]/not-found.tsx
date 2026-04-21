import Link from 'next/link';

export default function LocaleNotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-normal">Page not found</h1>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
      >
        Back to Home
      </Link>
    </div>
  );
}
