'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTheme } from 'next-themes';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Highlighter } from '@/shared/components/ui/highlighter';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

const GrainGradient = dynamic(
  () => import('@paper-design/shaders-react').then((mod) => mod.GrainGradient),
  {
    ssr: false,
  }
);

const Dithering = dynamic(
  () => import('@paper-design/shaders-react').then((mod) => mod.Dithering),
  {
    ssr: false,
  }
);

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const previewRef = useRef<HTMLImageElement | null>(null);
  const previewVisible = useIsVisible(previewRef);
  const [showShaders, setShowShaders] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowShaders(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const highlightText = section.highlight_text ?? '';
  let texts = null;
  if (highlightText) {
    texts = section.title?.split(highlightText, 2);
  }

  const previewImage = section.preview_image || section.image;
  const previewAlt =
    previewImage?.alt ||
    section.image?.alt ||
    section.image_invert?.alt ||
    'hero-preview';

  return (
    <section
      id={section.id}
      className={cn(
        'relative overflow-hidden px-3 pt-20 pb-8 md:px-6 md:pt-24 md:pb-16',
        section.className,
        className
      )}
    >
      <div className="relative mx-auto min-h-[720px] max-w-[1360px] overflow-hidden rounded-3xl border border-fd-border bg-fd-background text-landing-foreground shadow-xl dark:text-landing-foreground-dark">
        <div className="absolute inset-0">
          {showShaders && (
            <GrainGradient
              className="absolute inset-0 animate-in fade-in duration-700"
              colors={
                resolvedTheme === 'dark'
                  ? ['#39BE1C', '#9c2f05', '#7A2A0000']
                  : ['#fcfc51', '#ffa057', '#7A2A0020']
              }
              colorBack="#00000000"
              softness={1}
              intensity={0.9}
              noise={0.5}
              speed={previewVisible ? 1 : 0}
              shape="corners"
              minPixelRatio={1}
              maxPixelCount={1920 * 1080}
            />
          )}
          {showShaders && (
            <Dithering
              width={720}
              height={720}
              colorBack="#00000000"
              colorFront={resolvedTheme === 'dark' ? '#DF3F00' : '#fa8023'}
              shape="sphere"
              type="4x4"
              scale={0.5}
              size={3}
              speed={0}
              frame={5000 * 120}
              className="absolute animate-in fade-in duration-500 max-lg:bottom-[-50%] max-lg:left-[-200px] lg:top-[20%] lg:right-[14%]"
              minPixelRatio={1}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fd-background/20 to-fd-background/65" />
        </div>

        <div className="relative z-20 px-6 pt-14 pb-56 md:px-14 md:pt-18 md:pb-64 lg:px-16 lg:pt-22">
          {section.announcement && (
            <Link
              href={section.announcement.url || ''}
              target={section.announcement.target || '_self'}
              className="inline-flex h-11 items-center rounded-full border border-brand/45 bg-fd-card/45 px-5 text-sm font-medium text-brand backdrop-blur transition-colors hover:border-brand/70 hover:bg-fd-card/70"
            >
              {section.announcement.title}
            </Link>
          )}

          <div className="mt-8 max-w-[680px]">
            {texts && texts.length > 0 ? (
              <h1 className="text-balance text-5xl leading-[1.05] font-semibold tracking-normal text-fd-foreground md:text-6xl">
                {texts[0]}
                <Highlighter action="underline" color="#EDE781">
                  {highlightText}
                </Highlighter>
                {texts[1]}
              </h1>
            ) : (
              <h1 className="text-balance text-5xl leading-[1.05] font-semibold tracking-normal text-fd-foreground md:text-6xl">
                {section.title}
              </h1>
            )}

            <p
              className="mt-6 max-w-[620px] text-base leading-7 text-fd-muted-foreground md:text-lg"
              dangerouslySetInnerHTML={{ __html: section.description ?? '' }}
            />
          </div>

          {section.buttons && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {section.buttons.map((button, idx) => (
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  key={idx}
                  className={cn(
                    'h-14 rounded-full px-8 text-2xl font-semibold tracking-normal shadow-none transition-colors md:text-3xl',
                    idx === 0
                      ? 'bg-brand text-brand-foreground hover:bg-brand-200'
                      : 'border border-fd-border bg-fd-secondary/80 text-fd-secondary-foreground hover:bg-fd-accent'
                  )}
                >
                  <Link href={button.url ?? ''} target={button.target ?? '_self'}>
                    <span>{button.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          )}

          {section.tip && (
            <p
              className="mt-6 text-sm text-fd-muted-foreground"
              dangerouslySetInnerHTML={{ __html: section.tip ?? '' }}
            />
          )}
        </div>

        {previewImage?.src && (
          <Image
            ref={previewRef}
            src={previewImage.src}
            alt={previewAlt}
            width={previewImage.width || 1400}
            height={previewImage.height || 840}
            className={cn(
              'absolute right-[-14%] bottom-[-120px] z-30 w-[90%] max-w-[1060px] rounded-2xl border border-fd-border shadow-2xl md:right-[-8%] md:bottom-[-170px] lg:right-[-2%]',
              previewReady ? 'animate-in fade-in slide-in-from-bottom-8 duration-700' : 'invisible'
            )}
            onLoad={() => setPreviewReady(true)}
            priority
          />
        )}
      </div>
    </section>
  );
}

function useIsVisible(ref: RefObject<HTMLElement | null>): boolean {
  const [isIntersecting, setIsIntersecting] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isIntersecting;
}
