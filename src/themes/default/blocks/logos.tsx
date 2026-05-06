'use client';

import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function Logos({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn('py-16 md:py-24', section.className, className)}
    >
      <div className={`mx-auto max-w-5xl px-6`}>
        <ScrollAnimation>
          <p className="text-md text-center font-medium">{section.title}</p>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:gap-4">
            {section.items?.map((item, idx) => (
              <span
                key={idx}
                className="bg-background text-foreground border-border/70 inline-flex rounded-full border px-4 py-2 text-sm font-medium"
              >
                {item.title}
              </span>
            ))}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
