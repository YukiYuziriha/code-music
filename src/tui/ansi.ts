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
