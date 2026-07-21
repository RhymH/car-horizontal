"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

/**
 * Chart palette for the lead statistics page. The three series colors
 * (new = blue, won = green, lost = red) were validated with the dataviz
 * palette checker in both modes (CVD separation, normal-vision floor,
 * contrast vs surface). Won/lost carry meaning, so they also always ship
 * with a legend and direct labels — never color alone.
 */
export interface ChartTheme {
  dark: boolean;
  /** Series */
  blue: string;
  green: string;
  red: string;
  /** Ordinal blue ramp for funnel steps (light→dark with magnitude). */
  blueRamp: string[];
  /** Ink & chrome */
  textPrimary: string;
  textSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  tooltipBg: string;
}

const LIGHT: ChartTheme = {
  dark: false,
  blue: "#2a78d6",
  green: "#008300",
  red: "#e34948",
  blueRamp: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"],
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
  tooltipBg: "#ffffff",
};

const DARK: ChartTheme = {
  dark: true,
  blue: "#3987e5",
  green: "#008300",
  red: "#e66767",
  blueRamp: ["#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"],
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  surface: "#1c1c1e",
  tooltipBg: "#26262a",
};

const subscribeNoop = () => () => {};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  // next-themes only knows the theme after hydration; serve light on the
  // server snapshot so first paint stays deterministic.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  return mounted && resolvedTheme === "dark" ? DARK : LIGHT;
}

/** Shared ECharts fragments so every chart speaks the same visual language. */
export function baseTooltip(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.grid,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: t.textPrimary, fontSize: 12 },
    extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.12); border-radius: 8px;",
  };
}

export function baseAxisLabel(t: ChartTheme) {
  return { color: t.muted, fontSize: 11 };
}

export function baseSplitLine(t: ChartTheme) {
  return { lineStyle: { color: t.grid, width: 1 } };
}

export function baseLegend(t: ChartTheme) {
  return {
    top: 0,
    left: 0,
    icon: "circle",
    itemWidth: 9,
    itemHeight: 9,
    itemGap: 16,
    textStyle: { color: t.textSecondary, fontSize: 12 },
  };
}

export const percentFr = (v: number | null | undefined, digits = 0): string =>
  v === null || v === undefined
    ? "—"
    : `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: digits })} %`;
