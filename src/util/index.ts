import { COLORS } from "@constants/colors";
import sliceAnsi from "slice-ansi";

type AsyncWrapResult<Resolve, Reject> =
  | [Resolve, undefined | null]
  | [undefined | null, Reject];
export const asyncWrap = async <ResolveType, RejectType extends Error = Error>(
  promise: Promise<ResolveType>
): Promise<AsyncWrapResult<ResolveType, RejectType>> => {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, error as RejectType];
  }
};

export const removeElementFromArray = <T>(element: T, arr: T[]): void => {
  if (arr.indexOf(element) !== -1) {
    arr.splice(arr.indexOf(element), 1);
  }
};
export const isEven = (n: number): boolean => n % 2 === 0;
export const pad = (size: number): string => {
  return Array(Math.max(Math.round(size), 0) + 1).join(" ");
};
export const padEnd = (str: string, lineLength: number): string => {
  return `${str}${pad(lineLength - COLORS.remove(str).length)}`;
};
export const padStart = (str: string, lineLength: number): string => {
  return `${str}${pad(lineLength - COLORS.remove(str).length)}`;
};

export const padX = (str: string, lineLength: number): string => {
  let paddingSize = (lineLength - COLORS.remove(str).length) / 2;
  paddingSize = Math.round(paddingSize);
  const paddedLineLength = paddingSize * 2 + COLORS.remove(str).length;
  if (paddedLineLength > lineLength) {
    const excess = paddedLineLength - lineLength;
    return isEven(excess)
      ? `${pad(paddingSize - excess)}${str}${pad(paddingSize - excess)}`
      : `${pad(paddingSize)}${str}${pad(paddingSize - excess)}`;
  }
  return `${pad(paddingSize)}${str}${pad(paddingSize)}`;
};
export const joinWrapArray = () => {};
export const wrapString = (str: string, wrapLim: number): string => {
  return chunkString(str, wrapLim).join("\n");
};
export const chunkString = (
  string: string,
  chunkSize: number,
  indentation: number = 0
): string[] => {
  const chunks: string[] = [];
  const indent = COLORS.remove(string).match(/\s+/)?.[0] ?? "";
  let isFirst = true;
  while (string.length > 0) {
    if (isFirst) {
      chunks.push(sliceAnsi(string, 0, chunkSize));
      isFirst = false;
    } else {
      chunks.push(sliceAnsi(indent + string, 0, chunkSize));
    }
    string = sliceAnsi(string, chunkSize);
  }

  return chunks.map((chunk) => `${" ".repeat(indentation)}${chunk}`);
};

export const urlRgxp =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
