import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import { logoGroups, type LogoAsset } from "./logos";

const previewDims: Record<string, { width: number; height: number }> = {
  lockup: { width: 240, height: 104 },
  stacked: { width: 168, height: 196 },
  icon: { width: 120, height: 120 },
};

const downloadButton =
  "inline-flex h-8 items-center rounded-full border border-[var(--btn-ghost-border)] px-3 text-[13px] font-medium text-[var(--btn-ghost-text)] transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)]";

function LogoTile({
  asset,
  name,
  imageAlt,
  downloadAria,
  formatLabels,
  previewClassName,
  width,
  height,
}: {
  asset: LogoAsset;
  name: string;
  imageAlt: string;
  downloadAria: { svg: string; png: string };
  formatLabels: { svg: string; png: string };
  previewClassName: string;
  width: number;
  height: number;
}) {
  return (
    <div className="border-subtle overflow-hidden rounded-2xl border bg-[var(--surface)]">
      <div
        className={`flex min-h-[184px] items-center justify-center p-6 ${
          asset.tone === "dark" ? "bg-[#231F20]" : "bg-white"
        }`}
      >
        <Image
          src={asset.svg}
          alt={imageAlt}
          width={width}
          height={height}
          className={`${previewClassName} h-auto`}
        />
      </div>
      <div className="border-subtle flex items-center justify-between gap-3 border-t px-4 py-3">
        <span className="text-secondary text-sm">{name}</span>
        <div className="flex gap-2">
          <a
            href={asset.svg}
            download
            aria-label={downloadAria.svg}
            className={downloadButton}
          >
            {formatLabels.svg}
          </a>
          {asset.png ? (
            <a
              href={asset.png}
              download
              aria-label={downloadAria.png}
              className={downloadButton}
            >
              {formatLabels.png}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default async function LogoLibrary({
  locale,
}: {
  locale: Locale;
}): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "assets" });
  const formatLabels = {
    svg: t("formats.svg"),
    png: t("formats.png"),
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pt-28 pb-24 md:gap-20 md:px-12 lg:px-20 lg:pt-36">
      <h1 className="sr-only">{t("page.heading")}</h1>
      {logoGroups.map((group) => {
        const dims = previewDims[group.id] ?? { width: 200, height: 120 };
        return (
          <section key={group.id}>
            <h2 className="text-[30px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[38px]">
              {t(`groups.${group.id}`)}
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.assets.map((asset) => (
                <LogoTile
                  key={asset.id}
                  asset={asset}
                  name={t(`logos.${asset.messageKey}.name`)}
                  imageAlt={t(`logos.${asset.messageKey}.imageAlt`)}
                  downloadAria={{
                    svg: t(`logos.${asset.messageKey}.downloadAria`, {
                      format: "SVG",
                    }),
                    png: t(`logos.${asset.messageKey}.downloadAria`, {
                      format: "PNG",
                    }),
                  }}
                  formatLabels={formatLabels}
                  previewClassName={group.previewClassName}
                  width={dims.width}
                  height={dims.height}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
