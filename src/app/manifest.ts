import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneRome",
    short_name: "OneRome",
    description: "Una persona alla volta, a Roma. One person at a time, in Rome.",
    start_url: "/it/discover",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf8f3",
    theme_color: "#fbf8f3",
    lang: "it",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
