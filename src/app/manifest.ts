import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meal Timeline",
    short_name: "Meal Timeline",
    description: "Plan cooking timelines so every dish is ready on time.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f2",
    theme_color: "#e4572e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
