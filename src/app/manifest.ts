import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} | ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: brand.appIcons.classic, sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: brand.appIcons.light, sizes: "1024x1024", type: "image/png", purpose: "maskable" },
    ],
  };
}
