import * as inquirer from "@inquirer/core";
import type {} from "@inquirer/type";
import chalk from "chalk";
import figures from "figures";
import ansiEscapes from "ansi-escapes";
import { COLORS } from "@constants/colors";
import { isEven, padEnd } from "@util";
import { Prompt } from "./Prompt";
import { CONSOLE_WIDTH } from "@constants";
import { pad, padStart, padX } from "@util/padding";

export type List = [string, string | string[]][] | string[];
export type PaginatedListConfig = inquirer.AsyncPromptConfig & {
  title:
    | {
        odd: string;
        even: string;
      }
    | string;
  list: List;
  pageSize: number;
  default?: string;
};

function isLeftKey(key: { name: string }): boolean {
  return key.name === "left";
}
function isRightKey(key: { name: string }): boolean {
  return key.name === "right";
}
function isTabKey(key: { name: string }): boolean {
  return key.name === "tab";
}
function getLineWidths(list: List): number[] {
  return list.map(([name, value]) => {
    if (typeof value === "string") {
      return `${name}: ${value}`.length;
    }
    return `${name}: [${value.join(", ")}]`.length;
  });
}
function getLongestLineWidth(list: List, maxWidth: number): number {
  const lineWidths = getLineWidths(list);

  const longestValueWidth = list
    .map(([_, value]) => {
      if (typeof value === "string") {
        return value.length;
      }
      return value[0].length + 2;
    })
    .reduce((acc, value) => Math.max(acc, value), 0);

  return lineWidths.reduce((longest, width) => {
    if (width > maxWidth) return longest;
    return Math.max(longest, width);
  }, longestValueWidth);
}

function buildTitleBar(
  title: { odd: string; even: string } | string,
  maxWidth: number
): string {
  if (typeof title !== "string") {
    title = isEven(maxWidth) ? title.even : title.odd;
  }
  return chalk.bgWhite.black(padX(title, maxWidth + 2));
}
// function getLongestLine(line: string): string {

// }
export default Prompt.createPrompt(
  (config: PaginatedListConfig, done: (value: string) => void): string => {
    const { pageSize, title } = config;
    let { list } = config;
    // if (list.length === 0) list = [""];

    const firstRender = inquirer.useRef(true);
    const [status, setStatus] = inquirer.useState("pending");
    const [page, setPage] = inquirer.useState(0);
    const [verticalSize, setVerticalSize] = inquirer.useState(0);

    const lastPage = Math.trunc((list.length - 1) / pageSize);

    inquirer.useKeypress((key) => {
      const { isEnterKey, isNumberKey } = inquirer;
      if (isEnterKey(key)) {
        setStatus("done");
        return done("");
      }

      if (isNumberKey(key)) {
        const newPage = Number(key.name) - 1;
        if (newPage * pageSize >= list.length) {
          return;
        }

        return setPage(newPage);
      }

      if (isLeftKey(key) || isRightKey(key) || isTabKey(key)) {
        const offset = isRightKey(key) || isTabKey(key) ? 1 : -1;

        if (page + offset > lastPage) setPage(0);
        else if (page + offset < 0) setPage(lastPage);
        else setPage(Math.max(0, Math.min(page + offset, lastPage)));
      }
    });

    let message: string = chalk.bold(config.message);
    // if (firstRender.current) {
    //   message += chalk.dim(" (Use arrow keys)");
    //   firstRender.current = false;
    // }

    const lineWidth = CONSOLE_WIDTH;
    const paddingX = 4;
    let tableWidth = Math.round(lineWidth * 0.8) - 2;
    if (!isEven(CONSOLE_WIDTH - tableWidth)) {
      tableWidth -= 1;
    }

    const lineWidths = getLineWidths(list);
    const longestLineWidth = getLongestLineWidth(list, tableWidth);
    const titleLength =
      typeof title === "string"
        ? title.length
        : isEven(tableWidth)
        ? title.even.length
        : title.odd.length;

    if (
      longestLineWidth < tableWidth - paddingX &&
      longestLineWidth > titleLength
    ) {
      tableWidth = longestLineWidth + paddingX;
    } else if (longestLineWidth < titleLength) {
      tableWidth = titleLength + paddingX;
    }

    const { red, cyan, magenta, yellow, white } = chalk;
    const tableLines: string[] = [];
    const tableTitle = buildTitleBar(title, tableWidth);

    const sortedList = list
      .map((item, index) => ({ item, width: lineWidths[index] }))
      .sort((a, b) => b.width - a.width);
    const pageList = sortedList.slice(page * pageSize, (page + 1) * pageSize);
    for (let i = 0; i < pageList.length; i++) {
      const [name, value] = pageList[i].item;
      const lineWidth = pageList[i].width;

      let line = `${red(name)}${cyan(":")} ${magenta("[")}`;

      if (lineWidth <= tableWidth - paddingX) {
        if (typeof value === "string") {
          line += `${yellow(value)}${magenta("]")}`;
          tableLines.push(padEnd(`  ${line}`, tableWidth));
          continue;
        }
        line += `${yellow(value.join(white(", ")))}${magenta("]")}`;
        tableLines.push(padEnd(`  ${line}`, tableWidth));
        continue;
      }

      tableLines.push(padEnd(`  ${line}`, tableWidth));
      let tagLine = "";
      let currentWidth = 0;
      for (const tag of value) {
        currentWidth += tag.length + 2;
        if (currentWidth <= tableWidth - paddingX) {
          tagLine += `${yellow(tag)}, `;
          continue;
        }
        tableLines.push(padEnd(`    ${tagLine}`, tableWidth));
        currentWidth = tag.length + 2;
        tagLine = `${yellow(tag)}, `;
      }
      if (currentWidth <= tableWidth - paddingX) {
        tableLines.push(padEnd(`    ${tagLine}`, tableWidth));
      }
      tableLines.push(padEnd(`  ${magenta("]")}`, tableWidth));
    }
    for (let i = tableLines.length; i < verticalSize; i++) {
      tableLines.push("");
    }
    if (firstRender.current === true) {
      firstRender.current = false;
      setVerticalSize(tableLines.length);
    }
    if (list.length === 0) {
      tableLines.push("Empty");
    }
    tableLines.push(
      chalk.underline.white(
        padStart(chalk.cyan(`[${page + 1}, ${lastPage + 1}]`), tableWidth)
      )
    );

    const table = tableLines
      .map((line) => padX(`|${padX(line, tableWidth)}|`, CONSOLE_WIDTH))
      .join("\n");

    // let header = `[${page + 1}, ${lastPage + 1}]`
    // const header = chalk.dim("(Use num, tab or arrow keys to navigate)")
    let footer = chalk.underline(padEnd("", CONSOLE_WIDTH));
    return `${padX(tableTitle, CONSOLE_WIDTH)}\n${table}\n${footer}${
      ansiEscapes.cursorHide
    }`;
  }
);
