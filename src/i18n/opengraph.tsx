import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import type { Locale } from "./locale-registry.ts";
import {
  createOpenGraphRenderContract,
  openGraphContentType,
  openGraphSize,
} from "./opengraph-contract.ts";

export { openGraphContentType, openGraphSize };

const SUB_SIZE = 41;
const PADDING_LEFT = 72;
const PADDING_TOP = 100;
const fontDirectory = join(process.cwd(), "src", "app", "fonts");

export async function renderOpenGraphImage(locale: Locale) {
  const contract = createOpenGraphRenderContract(locale);
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
        {contract.headingLines.map((line) => (
          <div
            key={line}
            style={{
              width: "100%",
              fontFamily: "Geist",
              fontWeight: 700,
              color: "#1a1a1e",
              ...contract.headingStyle,
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
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        {contract.tagline}
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
