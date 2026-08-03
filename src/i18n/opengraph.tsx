import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { defaultLocale, type Locale } from "./config.ts";
import { getHomeMessages } from "./messages.ts";

export const openGraphSize = { width: 1200, height: 630 };
export const openGraphContentType = "image/png";

const HEADING_SIZE = 140;
const SUB_SIZE = Math.round(HEADING_SIZE * (28 / 96)); // matches homepage ratio
const PADDING_LEFT = 72;
const PADDING_TOP = 100;
const fontDirectory = join(process.cwd(), "src", "app", "fonts");

export async function renderOpenGraphImage(locale: Locale) {
  const copy = getHomeMessages(locale).openGraph;
  const heading = copy.heading.split("\n");
  const [geistBold, geistRegular] = await Promise.all([
    readFile(join(fontDirectory, "Geist-Bold.ttf")),
    readFile(join(fontDirectory, "Geist-Regular.ttf")),
  ]);
  const useLocalizedLayout = locale !== defaultLocale;

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
        {heading.map((line) => (
          <div
            key={line}
            style={{
              width: "100%",
              fontSize: useLocalizedLayout ? 68 : HEADING_SIZE,
              fontFamily: "Geist",
              fontWeight: 700,
              color: "#1a1a1e",
              lineHeight: useLocalizedLayout ? 1 : 0.9,
              letterSpacing: useLocalizedLayout ? "-0.02em" : "-0.04em",
              wordBreak: useLocalizedLayout ? "break-all" : "normal",
            }}
          >
            {line}
          </div>
        ))}
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
          ...(useLocalizedLayout
            ? { width: "100%", flexWrap: "wrap" as const }
            : {}),
        }}
      >
        {useLocalizedLayout
          ? copy.tagline
          : copy.tagline.split(" ").map((word, index) => (
              <span
                key={`${word}-${index}`}
                style={
                  index === 0 ? undefined : { marginLeft: index === 2 ? 4 : 9 }
                }
              >
                {word}
              </span>
            ))}
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
