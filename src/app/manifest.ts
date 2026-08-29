import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Visual Notes — New England CareFlow",
    short_name: "Visual Notes",
    description:
      "Narrative critical-care nursing documentation restructured into a source-verifiable body-system chart.",
    start_url: "/",
    display: "standalone",
    background_color: "#04121f",
    theme_color: "#052c52",
    icons: [
      { src: "/brand/icon-96.png", sizes: "96x96", type: "image/png" },
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
