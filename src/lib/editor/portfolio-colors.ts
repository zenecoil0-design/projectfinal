import type { CSSProperties } from "react";
/** text=null means a readable automatic document-body color; never affect contrast text on dark bands. */
export type PortfolioColors = { primary: string; secondary: string; text: string | null };
export type PortfolioTemplate = "classic" | "modern" | "minimal";

export const templateColors: Record<PortfolioTemplate, PortfolioColors> = {
  classic: { primary: "#1D416D", secondary: "#DCE8F3", text: null },
  modern: { primary: "#153E55", secondary: "#E4D7C6", text: null },
  minimal: { primary: "#466B73", secondary: "#D5DFE1", text: null },
};

export function defaultColors(template: string): PortfolioColors {
  return { ...(templateColors[template as PortfolioTemplate] ?? templateColors.classic) };
}

export function normalizeHex(input: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(input.trim());
  return match ? "#" + match[1].toUpperCase() : null;
}
export type HSV = { h: number; s: number; v: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hexToHsv(color: string): HSV {
  const hex = normalizeHex(color) ?? "#000000";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}
export function hsvToHex({ h, s, v }: HSV): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1), value = clamp(v, 0, 1);
  const c = value * saturation, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = value - c;
  const parts: number[][] = [
    [c, x, 0], [x, c, 0], [0, c, x],
    [0, x, c], [x, 0, c], [c, 0, x],
  ];
  return "#" + parts[Math.min(5, Math.floor(hue / 60))]
    .map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("").toUpperCase();
}
export function contrastInk(hex: string): "#FFFFFF" | "#172B3B" {
  const safe = normalizeHex(hex) ?? "#000000";
  const values = [1, 3, 5].map(index => parseInt(safe.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722) > 0.179
    ? "#172B3B" : "#FFFFFF";
}

/** Body text defaults remain dark on the white/cream A4 sheets of each template. */
export function automaticTextColor(template: string): string {
  switch (template) {
    case "minimal": return "#202A2D";
    case "modern": return "#1C3547";
    default: return "#243449";
  }
}
export function resolvedTextColor(colors: PortfolioColors, template: string): string {
  return colors.text ?? automaticTextColor(template);
}

/** Tolerate persisted two-color palettes from before text color support. */
export function parsePortfolioColors(raw: string | null, template: string): PortfolioColors {
  const defaults = defaultColors(template);
  if (!raw) return defaults;
  const legacy = normalizeHex(raw);
  if (legacy) return { ...defaults, primary: legacy };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    const record = parsed as Record<string, unknown>;
    if (typeof record.primary !== "string" || typeof record.secondary !== "string") return defaults;
    const primary = normalizeHex(record.primary);
    const secondary = normalizeHex(record.secondary);
    if (!primary || !secondary) return defaults;
    const text = record.text === null || record.text === undefined ? null
      : typeof record.text === "string" ? normalizeHex(record.text) : null;
    return { primary, secondary, text };
  } catch {
    return defaults;
  }
}
export function isDefaultColors(colors: PortfolioColors, template: string) {
  const defaults = defaultColors(template);
  return colors.primary === defaults.primary && colors.secondary === defaults.secondary && colors.text === defaults.text;
}

/** WCAG contrast estimate for user-selected body text on white/cream paper. */
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const safe = normalizeHex(hex) ?? "#000000";
    const values = [1, 3, 5].map(index => parseInt(safe.slice(index, index + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function portfolioThemeStyle(colors: PortfolioColors | null, template: string): CSSProperties {
 const palette = colors ?? defaultColors(template);
 return { "--portfolio-primary": palette.primary, "--portfolio-secondary": palette.secondary,
 "--portfolio-text": resolvedTextColor(palette, template), "--portfolio-on-primary": contrastInk(palette.primary),
 "--portfolio-on-secondary": contrastInk(palette.secondary) } as CSSProperties;
}
