import { COLORS } from "@constants/colors";

export const pad = (size: number): string => {
  return Array(Math.max(Math.round(size), 0) + 1).join(" ");
};

export const padEnd = (str: string, lineLength: number): string => {
  return `${str}${pad(lineLength - COLORS.remove(str).length)}`;
};

export const padStart = (str: string, lineLength: number): string => {
  return `${pad(lineLength - COLORS.remove(str).length)}${str}`;
};

export const padX = (str: string, lineLength: number): string => {
  let paddingSize = (lineLength - COLORS.remove(str).length) / 2;
  paddingSize = Math.round(paddingSize);
  const paddedLineLength = paddingSize * 2 + COLORS.remove(str).length;
  if (paddedLineLength > lineLength) {
    const excess = paddedLineLength - lineLength;
    return excess % 2 === 0
      ? `${pad(paddingSize - excess)}${str}${pad(paddingSize - excess)}`
      : `${pad(paddingSize)}${str}${pad(paddingSize - excess)}`;
  }
  return `${pad(paddingSize)}${str}${pad(paddingSize)}`;
};
