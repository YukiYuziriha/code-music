import { ESC } from "./theme.js";

export type Tone = "blue" | "cyan" | "green" | "amber" | "pink" | "gray";

const reset = `${ESC}[0m`;

const toneColor: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: "38;2;26;27;38", bg: "48;2;122;162;247" },
  cyan: { fg: "38;2;26;27;38", bg: "48;2;125;207;255" },
  green: { fg: "38;2;26;27;38", bg: "48;2;158;206;106" },
  amber: { fg: "38;2;26;27;38", bg: "48;2;224;175;104" },
  pink: { fg: "38;2;26;27;38", bg: "48;2;187;154;247" },
  gray: { fg: "38;2;169;177;214", bg: "48;2;65;72;104" },
};

export const paint = (text: string, tone: Tone, bold = false) => {
  const { fg, bg } = toneColor[tone];
  const weight = bold ? "1;" : "";
  return `${ESC}[${weight}${fg};${bg}m${text}${reset}`;
};

const clip = (text: string, width: number) => {
  if (text.length <= width) return text;
  return text.slice(0, Math.max(0, width));
};

export const cell = (text: string, width: number, tone: Tone, bold = false) => {
  const contentWidth = Math.max(0, width - 2);
  const content = clip(text, contentWidth).padEnd(contentWidth, " ");
  return paint(` ${content} `, tone, bold);
};

export const statusCell = (
  label: string,
  value: string,
  width: number,
  tone: Tone,
  bold = false,
) => {
  return cell(`${label.toUpperCase()}  ${value}`, width, tone, bold);
};

export const statusCellWithHint = (
  label: string,
  value: string,
  hint: string,
  width: number,
  tone: Tone,
  bold = false,
) => {
  const contentWidth = Math.max(0, width - 2);
  const hintText = hint.trim();

  if (hintText.length === 0) {
    return statusCell(label, value, width, tone, bold);
  }

  const leftWidth = Math.max(0, contentWidth - hintText.length - 1);
  const left = clip(`${label.toUpperCase()}  ${value}`, leftWidth).padEnd(
    leftWidth,
    " ",
  );
  return paint(` ${left} ${hintText} `, tone, bold);
};

type Rgb = readonly [number, number, number];

const toneRgb: Record<Tone, { fg: Rgb; bg: Rgb }> = {
  blue: {
    fg: [26, 27, 38],
    bg: [122, 162, 247],
  },
  cyan: {
    fg: [26, 27, 38],
    bg: [125, 207, 255],
  },
  green: {
    fg: [26, 27, 38],
    bg: [158, 206, 106],
  },
  amber: {
    fg: [26, 27, 38],
    bg: [224, 175, 104],
  },
  pink: {
    fg: [26, 27, 38],
    bg: [187, 154, 247],
  },
  gray: {
    fg: [169, 177, 214],
    bg: [65, 72, 104],
  },
};

const paintRgb = (text: string, fg: Rgb, bg: Rgb, bold = false): string => {
  const weight = bold ? "1;" : "";
  return `${ESC}[${weight}38;2;${fg[0]};${fg[1]};${fg[2]};48;2;${bg[0]};${bg[1]};${bg[2]}m${text}${reset}`;
};

const lerpRgb = (start: Rgb, end: Rgb, t: number): Rgb => {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(start[0] + (end[0] - start[0]) * clamped),
    Math.round(start[1] + (end[1] - start[1]) * clamped),
    Math.round(start[2] + (end[2] - start[2]) * clamped),
  ];
};

const withDelta = (color: Rgb, delta: number): Rgb => {
  const clampChannel = (channel: number): number => {
    return Math.max(0, Math.min(255, channel + delta));
  };

  return [
    clampChannel(color[0]),
    clampChannel(color[1]),
    clampChannel(color[2]),
  ];
};

const buildStatusContent = (
  label: string,
  value: string,
  width: number,
  hint?: string,
): string => {
  const contentWidth = Math.max(0, width - 2);
  const hintText = hint?.trim() ?? "";

  if (hintText.length === 0) {
    return clip(`${label.toUpperCase()}  ${value}`, contentWidth).padEnd(
      contentWidth,
      " ",
    );
  }

  const leftWidth = Math.max(0, contentWidth - hintText.length - 1);
  const left = clip(`${label.toUpperCase()}  ${value}`, leftWidth).padEnd(
    leftWidth,
    " ",
  );
  return `${left} ${hintText}`;
};

const renderProgressLine = (
  content: string,
  tone: Tone,
  progress: number,
  bold = false,
): string => {
  const palette = toneRgb[tone] ?? toneRgb.gray;
  const textFg = palette.fg;
  const baseBg = palette.bg;
  const emptyBg = withDelta(baseBg, -14);
  const filledStart = withDelta(baseBg, 8);
  const filledEnd = withDelta(baseBg, 20);

  const fullText = ` ${content} `;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillSpan = Math.max(1, fullText.length);
  const filledCount = Math.max(
    1,
    Math.round(1 + clampedProgress * (fillSpan - 1)),
  );

  let result = "";
  for (let index = 0; index < fullText.length; index += 1) {
    const ch = fullText[index] ?? " ";

    if (index < filledCount) {
      const t = index / Math.max(1, fullText.length - 1);
      result += paintRgb(ch, textFg, lerpRgb(filledStart, filledEnd, t), bold);
      continue;
    }

    result += paintRgb(ch, textFg, emptyBg, bold);
  }

  return result;
};

export const progressStatusCell = (
  label: string,
  value: string,
  width: number,
  tone: Tone,
  progress: number,
  bold = false,
): string => {
  const content = buildStatusContent(label, value, width);
  return renderProgressLine(content, tone, progress, bold);
};

export const progressStatusCellWithHint = (
  label: string,
  value: string,
  hint: string,
  width: number,
  tone: Tone,
  progress: number,
  bold = false,
): string => {
  const content = buildStatusContent(label, value, width, hint);
  return renderProgressLine(content, tone, progress, bold);
};

export const keyCell = (key: string, pressed: boolean) => {
  return pressed
    ? paint(` ${key.toUpperCase()} `, "amber", true)
    : paint(` ${key.toUpperCase()} `, "gray", false);
};

export const dividerInk = (text: string) => {
  return `${ESC}[38;2;65;72;104m${text}${reset}`;
};

export const divider = (width: number) => {
  return dividerInk("─".repeat(width));
};

export const row = (left: string, right: string) => {
  return `${left}${dividerInk("│")}${right}`;
};
