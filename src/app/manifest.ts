import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    icons: [
      { src: brand.appIcons.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brand.appIcons.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brand.appIcons.maskable192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: brand.appIcons.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
