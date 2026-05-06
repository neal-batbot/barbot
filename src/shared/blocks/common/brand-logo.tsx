import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center gap-2 ${brand.className}`}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.title ? '' : brand.logo.alt || ''}
          width={brand.logo.width || 100}
          height={brand.logo.height || 100}
          className="h-8 w-auto md:h-9"
        />
      )}
      {brand.title && (
        <span className="text-base font-semibold tracking-tight md:text-lg">
          {brand.title}
        </span>
      )}
    </Link>
  );
}
