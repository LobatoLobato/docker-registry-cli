import * as inquirer from "@inquirer/core";
import type {} from "@inquirer/type";
import chalk from "chalk";
import figures from "figures";
import ansiEscapes from "ansi-escapes";
import { COLORS } from "@constants/colors";
import { padEnd } from "@util";
import { Prompt } from "./Prompt";
import { CONSOLE_WIDTH } from "@constants";

export type SelectConfig<A extends ReadonlyArray<string>> =
  inquirer.AsyncPromptConfig & {
    choices: A;
    pageSize?: number;
    lineWidth?: number;
    default?: string;
  };

function isSelectableChoice(choice?: string): choice is string {
  return choice != null;
}

export default Prompt.createPrompt(
  <const A extends ReadonlyArray<string>>(
    config: SelectConfig<A>,
    done: (value: A[number]) => void,
  ): A[number] => {
    const lineWidth = config.lineWidth ?? 0;
    const choices = config.choices;

    if (choices.length === 0) {
      throw new Error("Choices array is empty");
    }

    const firstRender = inquirer.useRef(true);
    const [status, setStatus] = inquirer.useState("pending");
    const [cursorPosition, setCursorPos] = inquirer.useState(() => {
      const startIndex = config.default ? choices.indexOf(config.default) : 0;
      return startIndex;
    });

    // Safe to assume the cursor position always point to a Choice.
    let choice = choices[cursorPosition];

    inquirer.useKeypress((key) => {
      const { isEnterKey, isDownKey, isUpKey, isNumberKey } = inquirer;
      if (isEnterKey(key)) {
        setStatus("done");
        return done(choice);
      }
      if (isNumberKey(key)) {
        // Adjust index to start at 1
        const newCursorPosition = Number(key.name) - 1;
        if (!isSelectableChoice(choices[newCursorPosition])) {
          return;
        }

        return setCursorPos(newCursorPosition);
      }
      if (!isUpKey(key) && !isDownKey(key)) return;
      const offset = isUpKey(key) ? -1 : 1;
      let newCursorPosition = cursorPosition;
      let selectedOption;

      while (!isSelectableChoice(selectedOption)) {
        newCursorPosition += offset + choices.length;
        newCursorPosition %= choices.length;
        selectedOption = choices[newCursorPosition];
      }

      return setCursorPos(newCursorPosition);
    });

    let message: string = chalk.bold(config.message);
    if (firstRender.current) {
      message += chalk.dim(" (Use arrow keys)");
      firstRender.current = false;
    }

    const allChoices = choices
      .map((choice, index): string => {
        if (index !== cursorPosition) return `    ${choice}`;

        return COLORS.select(
          padEnd(`${figures.pointer}   ${choice}`, lineWidth),
        );
      })
      .join("\n");

    const windowedChoices = inquirer.usePagination(allChoices, {
      active: cursorPosition,
      pageSize: config.pageSize,
    });
    let prefixed_message =
      status === "done"
        ? ` ${chalk.green(figures.circleFilled)} ${message}`
        : ` ${chalk.yellow(figures.circleFilled)} ${message}`;

    const bottomMargin = chalk.underline(padEnd("", CONSOLE_WIDTH));
    if (status === "done") {
      choice = choice.toUpperCase();
      return `${prefixed_message}\n${bottomMargin}\n${chalk.bgGreen.black(
        `| ${choice} |`,
      )}`;
    }

    return `${prefixed_message}\n${windowedChoices}${ansiEscapes.cursorHide}\n${bottomMargin}`;
  },
);
