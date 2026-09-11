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
    theme_color: "#012850",
    // "any" icons are shown as drawn; "maskable" icons may be cropped by the
    // launcher to a circle or squircle, so their artwork sits inside the
    // central safe zone. Offering both lets each launcher pick what it needs.
    icons: [
      { src: "/icons/vn-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/vn-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/vn-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/vn-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
