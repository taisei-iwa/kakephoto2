import NextImage from "next/image";
import type { ImageProps } from "next/image";
import { IMG_V } from "@/lib/imageVersion";

const VERSIONED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

function withVersion(src: string): string {
  const lower = src.toLowerCase();
  if (!VERSIONED_EXTS.some((ext) => lower.includes(ext))) return src;
  return `${src}?v=${IMG_V}`;
}

export default function VImage(props: ImageProps) {
  const src =
    typeof props.src === "string" ? withVersion(props.src) : props.src;
  return <NextImage {...props} src={src} />;
}
