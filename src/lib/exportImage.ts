/**
 * Download the chart as a PNG.
 *
 * The chart is drawn as native SVG from the JSON (see chartSvg.ts) rather than
 * screenshotted from the DOM: this browser taints a canvas as soon as an SVG
 * containing <foreignObject> is drawn onto it, so `toBlob` throws a
 * SecurityError. Plain SVG rasterises without tainting, so this path works and
 * has the useful side effect of being deterministic.
 */

import { renderChartSvg, readTheme } from "./chartSvg";
import type { VisualNote } from "./demo";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadChartPng(
  result: VisualNote,
  filename = "visual-note.png",
  scale = 2,
): Promise<void> {
  const svg = renderChartSvg(result, readTheme());

  // Catch malformed markup here, where the error is readable, rather than as a
  // bare image-load failure later.
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parseError = parsed.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Generated SVG is invalid: ${parseError.textContent?.slice(0, 200)}`);
  }

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterise the chart"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    const png: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!png) throw new Error("Could not encode the image");
    triggerDownload(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
