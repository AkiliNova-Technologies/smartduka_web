"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { mediaSource } from "@/lib/media";

type MediaImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  fallback: string;
  fallbackClassName?: string;
};

export function MediaImage({
  src,
  fallback,
  className,
  fallbackClassName,
  ...props
}: MediaImageProps) {
  const preferredSource = mediaSource(src, fallback);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const usingFallback = preferredSource === fallback || failedSource === preferredSource;
  const currentSource = usingFallback ? fallback : preferredSource;

  return (
    <Image
      {...props}
      src={currentSource}
      alt=""
      className={cn(className, usingFallback && fallbackClassName)}
      onError={() => {
        if (!usingFallback) setFailedSource(preferredSource);
      }}
    />
  );
}
