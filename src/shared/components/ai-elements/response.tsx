"use client";

import { cn } from "@/shared/lib/utils";
import { type ComponentProps, memo, useCallback } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

/**
 * Proxy external image/media URLs through /api/dify/file.
 *
 * rehype-harden (inside Streamdown) runs BEFORE urlTransform and allows
 * absolute http/https URLs when `allowedImagePrefixes: ["*"]`.
 * urlTransform runs during React rendering, AFTER rehype-harden,
 * so returning a relative proxy URL here is safe — it won't be re-checked.
 */
function proxyImageUrl(url: string): string {
  if (!url) return url;
  // Already proxied
  if (url.startsWith("/api/dify/file")) return url;
  // Proxy all external http/https image URLs through the Dify file proxy.
  // The proxy only adds auth headers when the target host matches the Dify API host;
  // for other URLs it acts as a simple pass-through.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/dify/file?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export const Response = memo(
  ({ className, urlTransform: externalUrlTransform, ...props }: ResponseProps) => {
    const transformUrl = useCallback(
      (url: string, key: string, node: any) => {
        // Apply external transform first if provided
        let transformed = externalUrlTransform
          ? externalUrlTransform(url, key, node)
          : url;
        if (!transformed) return transformed;
        // Proxy external image/media src URLs through the Dify file proxy
        if (key === "src") {
          transformed = proxyImageUrl(transformed);
        }
        // Also proxy href links that point to Dify file endpoints
        if (
          key === "href" &&
          /\/files\/|\/Files\/|file-preview|image-preview/i.test(transformed)
        ) {
          transformed = proxyImageUrl(transformed);
        }
        return transformed;
      },
      [externalUrlTransform]
    );

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        urlTransform={transformUrl}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";