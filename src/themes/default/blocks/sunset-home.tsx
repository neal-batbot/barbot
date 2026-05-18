'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { Section } from '@/shared/types/blocks/landing';
import { Hero } from '@/themes/default/blocks/hero';

const Dithering = dynamic(
  () => import('@paper-design/shaders-react').then((mod) => mod.Dithering),
  { ssr: false }
);

export function SunsetHome({
  sections,
}: {
  sections: Record<string, Section>;
}) {
  const introduce = sections.introduce;
  const benefits = sections.benefits;
  const usage = sections.usage;
  const features = sections.features;

  return (
    <div className="text-landing-foreground dark:text-landing-foreground-dark pb-10">
      {sections.hero ? <Hero section={sections.hero} /> : null}

      <div className="mx-auto mt-10 grid w-full max-w-[1400px] grid-cols-1 gap-8 px-5 md:gap-10 md:px-12">
        <p className="text-landing-foreground dark:text-landing-foreground-dark text-2xl leading-[1.2] font-light md:text-[3.15rem]">
          {sections.hero?.statement ||
            'Agentic AI is not a design prompt. It is a product system with knowledge, tools, permissions, billing, and resilient model supply.'}
        </p>

        <TryOutBlock />

        <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-2">
          <InfoCard
            title={introduce?.title || 'A framework people love.'}
            description={
              introduce?.description ||
              'Loved by teams and developers from startups to enterprise.'
            }
            button={introduce?.buttons?.[0]}
          />
          <ImageCard
            title={benefits?.title || 'Model supply that keeps working.'}
            description={
              benefits?.description ||
              'Route requests by plan, quota, model cost, and provider health.'
            }
            image="/imgs/barbot/why-stronger-v2.png"
          />
          <ImageCard
            title={usage?.title || 'Built for real workflows.'}
            description={
              usage?.description ||
              'Turn domain assets into AI that can answer, act, and be measured.'
            }
            image="/imgs/barbot/owned-ai-flow-v2.png"
          />
          <ImageCard
            title={features?.title || 'Commercial loop included.'}
            description={
              features?.description ||
              'Login, payment, subscriptions, usage, and billing events are part of the product.'
            }
            image="/imgs/barbot/launch-ready-capabilities-v2.png"
          />
        </div>
      </div>
    </div>
  );
}

function TryOutBlock() {
  return (
    <div className="border-fd-border bg-fd-card/55 relative overflow-hidden rounded-2xl border p-4 shadow-lg md:p-8">
      <AgnosticBackground />
      <div className="border-fd-border bg-fd-card/90 relative z-10 mx-auto w-full max-w-[900px] rounded-2xl border p-3 shadow-2xl backdrop-blur">
        <div className="border-fd-border flex items-center gap-2 border-b pb-2">
          <span className="border-brand/50 text-brand rounded-xl border-2 px-2 py-1 font-mono text-xs font-bold uppercase">
            Try It Out
          </span>
          <span className="mr-2 ml-auto size-2 rounded-full bg-red-400" />
        </div>
        <div className="border-fd-border bg-fd-secondary mt-3 rounded-xl border p-4">
          <p className="text-fd-secondary-foreground font-mono text-sm">
            barbot deploy owned-ai
          </p>
          <pre className="text-fd-muted-foreground mt-4 font-mono text-sm whitespace-pre-wrap">{`◇ Project name
│ industry-copilot
│
◆ Build loop
│ ● ingest docs, specs, tickets, and APIs
│ ● route models by plan, quota, and provider health
│ ● ship chat, usage, billing, and fallback recovery
│ ● keep the AI owned by your company`}</pre>
          <div className="border-fd-border bg-fd-popover text-fd-muted-foreground mt-4 ml-auto w-fit rounded-md border p-2 text-xs">
            Owned AI launched.
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  description,
  button,
}: {
  title: string;
  description: string;
  button?: { title?: string; url?: string; target?: string };
}) {
  return (
    <div className="border-fd-border bg-fd-card text-fd-card-foreground rounded-2xl border p-6 shadow-lg">
      <h3 className="text-2xl leading-tight font-semibold tracking-normal md:text-3xl">
        {title}
      </h3>
      <p className="text-fd-muted-foreground mt-4 text-sm leading-6 md:text-base">
        {description}
      </p>
      {button?.url ? (
        <Link
          href={button.url}
          target={button.target || '_self'}
          className="bg-brand text-brand-foreground hover:bg-brand-200 mt-8 inline-flex rounded-full px-5 py-3 font-medium transition-colors"
        >
          {button.title || 'Explore'}
        </Link>
      ) : null}
    </div>
  );
}

function ImageCard({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div className="border-fd-border bg-fd-card relative min-h-[320px] overflow-hidden rounded-2xl border shadow-lg">
      <Image src={image} alt={title} fill className="object-contain p-4" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      <div className="absolute right-0 bottom-0 left-0 z-10 p-5 md:p-6">
        <h3 className="text-2xl leading-tight font-semibold tracking-normal text-zinc-50 md:text-3xl">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-200 md:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

function AgnosticBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIsVisible(ref);

  return (
    <div
      ref={ref}
      className="absolute inset-0 -z-0 [mask-image:linear-gradient(to_top,white_30%,transparent_100%)] opacity-90"
    >
      <Dithering
        colorBack="#00000000"
        colorFront="#c6bb58"
        shape="warp"
        type="4x4"
        speed={visible ? 0.4 : 0}
        className="size-full"
        minPixelRatio={1}
      />
    </div>
  );
}

function useIsVisible(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}
