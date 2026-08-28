import * as PIXI from "pixi.js";
import { Ticker } from "@createjs/core";
import { Tween } from "@createjs/tweenjs";
import HeroTimeline from "./HeroTimeline";
import ReplayDataSource from "../data/ReplayDataSource";
import APIDataSource from "../data/APIDataSource";
import SnapshotReplayDataSource from "../data/SnapshotReplayDataSource";
import { heroTheme } from "./theme";
import { destroyBlockTexturesForRenderer } from "./BlockSprite";
import type { BlocksAndEdgesAndHeightGroups, ReplayData } from "../data/types";

type DataSource = ReplayDataSource | APIDataSource | SnapshotReplayDataSource;

export default class HeroDag {
  private application: PIXI.Application | undefined;
  private timeline: HeroTimeline | undefined;
  private dataSource: DataSource | undefined;
  private tickId: number | undefined;
  private lastRenderedData: BlocksAndEdgesAndHeightGroups | null = null;

  private currentScale: number;
  private currentWidth: number = 0;
  private currentHeight: number = 0;
  private isVisible: boolean = true;
  private isPaused: boolean;
  private observer: IntersectionObserver | undefined;
  private resizeObserver: ResizeObserver | undefined;

  private backgroundAlpha: number;
  private maxDpr: number;

  constructor(
    scale: number = 0.4,
    backgroundAlpha: number = 1,
    maxDpr: number = 2,
    paused: boolean = false,
  ) {
    this.currentScale =
      Math.round(Math.max(0.2, Math.min(scale, 1.2)) * 10) / 10;
    this.backgroundAlpha = backgroundAlpha;
    this.maxDpr = maxDpr;
    this.isPaused = paused;
    Ticker.timingMode = Ticker.RAF;
  }

  async initialize(canvas: HTMLCanvasElement) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const parentElement = canvas.parentElement;
    if (!parentElement) {
      throw new Error(
        "DAG Hero canvas must be attached before initialization.",
      );
    }

    const application = new PIXI.Application();
    await application.init({
      backgroundColor: heroTheme.background,
      backgroundAlpha: this.backgroundAlpha,
      canvas,
      resizeTo: parentElement,
      antialias: true,
      resolution: dpr,
      autoDensity: true,
      autoStart: false,
    });

    this.application = application;
    this.timeline = new HeroTimeline(application);
    this.timeline.setScaleGetter(() => this.currentScale);
    application.stage.addChild(this.timeline);

    // Resize check
    application.ticker.add(this.resizeIfRequired);

    application.start();

    // IntersectionObserver to pause when offscreen
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this.isVisible = entry.isIntersecting;
          if (this.isVisible && !this.isPaused) {
            this.application?.start();
          } else {
            this.application?.stop();
          }
        }
      },
      { threshold: 0 },
    );
    this.observer.observe(canvas);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(parentElement);

    this.resize();
    if (this.isPaused) this.application.stop();
  }

  loadAPI(apiUrl: string) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[DAG Hero] Live API mode: ${apiUrl}`);
    }
    const ds = new APIDataSource(apiUrl);
    this.dataSource = ds;
    ds.startPolling(14);
    this.run();
  }

  async loadReplay(url: string) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[DAG Hero] Replay mode: ${url}`);
    }
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(
        `Replay fetch failed (${resp.status} ${resp.statusText})`,
      );
    }

    const replayData: ReplayData = await resp.json();
    const ds = new ReplayDataSource(replayData);
    this.dataSource = ds;

    ds.setOnNewBlock(() => {
      // Debounce - only update on tick
    });

    this.run();
  }

  async loadSnapshotReplay(url: string, playbackRate: number = 1) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[DAG Hero] Snapshot replay mode: ${url} (speed=${playbackRate}x)`,
      );
    }
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(
        `Snapshot replay fetch failed (${resp.status} ${resp.statusText})`,
      );
    }

    const replayData = await resp.json();
    this.dataSource = new SnapshotReplayDataSource(
      replayData,
      playbackRate,
      this.isPaused,
    );
    this.run();
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const renderer = this.application?.renderer;
    if (!renderer) return;

    const resizeTo = this.application?.resizeTo as HTMLDivElement;
    const width = resizeTo.clientWidth;
    const height = resizeTo.clientHeight;

    if (
      renderer.resolution !== dpr ||
      renderer.screen.width !== width ||
      renderer.screen.height !== height
    ) {
      renderer.resolution = dpr;
      renderer.resize(width, height);
    }

    this.currentWidth = renderer.screen.width;
    this.currentHeight = renderer.screen.height;
    this.timeline?.recalculatePositions();
    if (this.isPaused) this.application?.render();
  };

  private resizeIfRequired = () => {
    const w = this.getDisplayWidth();
    const h = this.getDisplayHeight();
    if (this.currentWidth !== w || this.currentHeight !== h) {
      this.currentWidth = w;
      this.currentHeight = h;
      this.resize();
    }
  };

  private getDisplayHeight() {
    return this.application?.renderer.screen.height ?? 0;
  }

  private getDisplayWidth() {
    return this.application?.renderer.screen.width ?? 0;
  }

  private run() {
    window.clearTimeout(this.tickId);
    this.lastRenderedData = null;
    this.tick();
  }

  private tick = () => {
    if (!this.dataSource || !this.timeline) return;

    const maxBlockAmountOnHalfTheScreen =
      this.timeline.getMaxBlockAmountOnHalfTheScreen();
    const heightDifference =
      this.timeline.getVisibleSlotAmountAfterHalfTheScreen(120);
    const data = this.dataSource.getHead(
      maxBlockAmountOnHalfTheScreen + heightDifference,
    );

    if (data && data !== this.lastRenderedData) {
      this.lastRenderedData = data;
      let maxHeight = 0;
      for (const block of data.blocks) {
        if (block.height > maxHeight) maxHeight = block.height;
      }

      const targetHeight = Math.max(0, maxHeight - heightDifference);
      this.timeline.setTargetHeight(targetHeight, !this.isPaused);
      this.timeline.setBlocksAndEdgesAndHeightGroups(data, !this.isPaused);
    }

    if (this.isPaused) {
      this.timeline.recalculatePositions();
      this.application?.render();
    } else {
      this.scheduleNextTick();
    }
  };

  private scheduleNextTick() {
    const interval = this.dataSource?.getTickInterval() ?? 500;
    this.tickId = window.setTimeout(this.tick, interval);
  }

  setPaused(paused: boolean) {
    if (this.isPaused === paused) return;
    this.isPaused = paused;

    if (paused) {
      window.clearTimeout(this.tickId);
      this.tickId = undefined;
      if (this.dataSource instanceof SnapshotReplayDataSource) {
        this.dataSource.pause();
      }
      Tween.removeAllTweens();
      this.timeline?.settleAnimations();
      this.application?.render();
      this.application?.stop();
      return;
    }

    if (this.dataSource instanceof SnapshotReplayDataSource) {
      this.dataSource.resume();
    }
    if (this.isVisible) this.application?.start();
    this.tick();
  }

  stop() {
    window.clearTimeout(this.tickId);
    this.tickId = undefined;
    this.lastRenderedData = null;
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.dataSource?.destroy();
    this.dataSource = undefined;
    // Kill all active tweens before destroying sprites.
    Tween.removeAllTweens();
    if (this.application) {
      destroyBlockTexturesForRenderer(this.application.renderer);
      this.application.stop();
      // Don't pass true to destroy() - we manage canvas removal in React.
      this.application.destroy(false, { children: true });
    }
    this.application = undefined;
    this.timeline = undefined;
  }
}
