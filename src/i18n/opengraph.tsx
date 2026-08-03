import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import type { Locale } from "./config.ts";

export const openGraphAlt = "Kaspa — Real-time Decentralization";
export const openGraphSize = { width: 1200, height: 630 };
export const openGraphContentType = "image/png";

const HEADING_SIZE = 140;
const SUB_SIZE = Math.round(HEADING_SIZE * (28 / 96)); // matches homepage ratio
const PADDING_LEFT = 72;
const PADDING_TOP = 100;
const fontDirectory = join(process.cwd(), "src", "app", "fonts");

const openGraphCopy = {
  en: {
    heading: ["Real-time", "Decentralization"],
    tagline: ["bitcoin\u2019s", "proof-of-work", "without", "the", "wait."],
  },
} as const satisfies Record<
  Locale,
  { heading: readonly [string, string]; tagline: readonly string[] }
>;

export async function renderOpenGraphImage(locale: Locale) {
  const copy = openGraphCopy[locale];
  const [geistBold, geistRegular] = await Promise.all([
    readFile(join(fontDirectory, "Geist-Bold.ttf")),
    readFile(join(fontDirectory, "Geist-Regular.ttf")),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#f5f5f7",
        padding: `${PADDING_TOP}px ${PADDING_LEFT}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: HEADING_SIZE,
            fontFamily: "Geist",
            fontWeight: 700,
            color: "#1a1a1e",
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
          }}
        >
          {copy.heading[0]}
        </div>
        <div
          style={{
            fontSize: HEADING_SIZE,
            fontFamily: "Geist",
            fontWeight: 700,
            color: "#1a1a1e",
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
          }}
        >
          {copy.heading[1]}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          fontSize: SUB_SIZE,
          fontFamily: "Geist",
          fontWeight: 400,
          color: "rgba(26, 26, 30, 0.65)",
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          marginTop: 40,
          marginLeft: 5,
        }}
      >
        <span>{copy.tagline[0]}</span>
        <span style={{ marginLeft: 9 }}>{copy.tagline[1]}</span>
        <span style={{ marginLeft: 4 }}>{copy.tagline[2]}</span>
        <span style={{ marginLeft: 9 }}>{copy.tagline[3]}</span>
        <span style={{ marginLeft: 9 }}>{copy.tagline[4]}</span>
      </div>
    </div>,
    {
      ...openGraphSize,
      fonts: [
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
