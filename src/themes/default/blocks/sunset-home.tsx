'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { Link } from '@/core/i18n/navigation';
import { Hero } from '@/themes/default/blocks/hero';
import { Section } from '@/shared/types/blocks/landing';

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
    <div className="pb-10">
      {sections.hero ? <Hero section={sections.hero} /> : null}

      <div className="mx-auto mt-10 grid w-full max-w-[1400px] grid-cols-1 gap-10 px-6 md:px-12">
        <p className="text-2xl leading-tight font-light text-zinc-100 md:text-4xl">
          Fumadocs is a <span className="font-medium text-[#efe879]">React.js</span>{' '}
          documentation framework for{' '}
          <span className="font-medium text-[#efe879]">Developers</span>, beautifully
          designed by <span className="font-medium text-[#efe879]">Fuma Nama</span>.
          Bringing powerful features for your docs workflows.
        </p>

        <TryOutBlock />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InfoCard
            title={introduce?.title || 'A framework people love.'}
            description={
              introduce?.description ||
              'Loved by teams and developers from startups to enterprise.'
            }
            button={introduce?.buttons?.[0]}
          />
          <ImageCard
            title={benefits?.title || 'Minimal aesthetics, Maximum customizability.'}
            description={
              benefits?.description ||
              'Plug your own UI while keeping production-ready docs components.'
            }
            image="/imgs/fumadocs/shadcn.png"
          />
          <ImageCard
            title={usage?.title || 'Built for real workflows.'}
            description={
              usage?.description ||
              'Create docs quickly with markdown, codeblocks, and interactive components.'
            }
            image="/imgs/fumadocs/story.png"
          />
          <ImageCard
            title={features?.title || 'OpenAPI and engineering-first docs.'}
            description={
              features?.description ||
              'Compose docs, APIs, and product guides in one coherent system.'
            }
            image="/imgs/fumadocs/main.png"
          />
        </div>
      </div>
    </div>
  );
}

function TryOutBlock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 p-4 md:p-8">
      <AgnosticBackground />
      <div className="relative z-10 mx-auto w-full max-w-[900px] rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-3 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-700 pb-2">
          <span className="rounded-xl border-2 border-[#e8de76]/60 px-2 py-1 font-mono text-xs font-bold text-[#efe879] uppercase">
            Try It Out
          </span>
          <span className="ml-auto mr-2 size-2 rounded-full bg-red-400" />
        </div>
        <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <p className="font-mono text-sm text-zinc-300">pnpm create fumadocs-app</p>
          <pre className="mt-4 whitespace-pre-wrap font-mono text-sm text-zinc-400">{`◇ Project name
│ my-app
│
◆ Choose a framework
│ ● Next.js
│ ○ Waku
│ ○ Tanstack Start
│ ○ React Router`}</pre>
          <div className="mt-4 ml-auto w-fit rounded-md border border-zinc-600 bg-zinc-800 p-2 text-xs text-zinc-300">
            New App launched!
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
    <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-6 text-zinc-100">
      <h3 className="text-4xl font-medium tracking-tight">{title}</h3>
      <p className="mt-4 text-zinc-300">{description}</p>
      {button?.url ? (
        <Link
          href={button.url}
          target={button.target || '_self'}
          className="mt-8 inline-flex rounded-full bg-[#efe879] px-5 py-3 font-medium text-zinc-900"
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
    <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900">
      <Image src={image} alt={title} fill className="object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />
      <div className="absolute right-0 bottom-0 left-0 z-10 p-6">
        <h3 className="text-4xl leading-tight font-medium tracking-tight text-zinc-100">
          {title}
        </h3>
        <p className="mt-3 text-zinc-300">{description}</p>
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
      className="absolute inset-0 -z-0 opacity-90 [mask-image:linear-gradient(to_top,white_30%,transparent_100%)]"
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
