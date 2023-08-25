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
    defaultChoice?: string;
    choices: A;
    pageSize?: number;
    lineWidth?: number;
    defaultValues?: Partial<Record<A[number], string>>;
    doneLabel?: string;
    cancelLabel?: string;
    doneMessage?: string;
    pretty?: {
      capitalize?: "first" | "all" | "allInitials";
      underscoresToSpaces?: boolean;
    };
  };

type ReturnType<A extends ReadonlyArray<string>> = Record<A[number], string>;

function isSelectableChoice(choice?: string): choice is string {
  return choice != null;
}

export default Prompt.createPrompt(
  <const A extends ReadonlyArray<string>>(
    config: SelectConfig<A>,
    done: (value: ReturnType<A> | null) => void,
  ): string => {
    const doneLabel = config.doneLabel ?? "Done";
    const cancelLabel = config.cancelLabel ?? "Cancel";
    const doneMessage = config.doneMessage ?? "Done";
    const choices = [...config.choices, doneLabel, cancelLabel];
    if (choices.length === 1) {
      throw new Error("Choices array is empty");
    }

    const firstRender = inquirer.useRef(true);
    const [status, setStatus] = inquirer.useState("pending");
    const [cursorPosition, setCursorPos] = inquirer.useState(() => {
      const startIndex = config.defaultChoice
        ? choices.indexOf(config.defaultChoice)
        : 0;
      return startIndex;
    });

    const [values, setValues] = inquirer.useState<string[]>(
      choices.map((choice) => {
        if (!config.defaultValues) return "";
        return (
          config.defaultValues[choice as keyof typeof config.defaultValues] ??
          ""
        );
      }),
    );
    const [currentValue, setCurrentValue] = inquirer.useState<string>(
      values[cursorPosition],
    );
    const [cursorPositionX, setCursorPositionX] = inquirer.useState<number>(0);

    // Safe to assume the cursor position always point to a Choice.
    let choice = choices[cursorPosition];

    inquirer.useKeypress((key, rl) => {
      const { isEnterKey, isDownKey, isUpKey, isNumberKey } = inquirer;
      if (isEnterKey(key)) {
        if (choice === doneLabel) {
          const result: ReturnType<A> = {} as ReturnType<A>;

          choices.forEach((choice, index) => {
            result[choice as keyof ReturnType<A>] = values[index];
          });

          setStatus("done");
          delete result[doneLabel as keyof ReturnType<A>];
          delete result[cancelLabel as keyof ReturnType<A>];
          return done(result);
        }
        if (choice === cancelLabel) {
          setStatus("canceled");
          return done(null);
        }
        if (status === "writing" || status === "writing-start") {
          setValues(
            values.map((value, index) =>
              index === cursorPosition ? currentValue : value,
            ),
          );
          setStatus("selecting");
        } else {
          rl.write(values[cursorPosition]);
          setCursorPositionX(values[cursorPosition].length);
          setCurrentValue(values[cursorPosition]);
          setStatus("writing-start");
        }
        return;
      }
      if (status === "writing-start") {
        setCursorPositionX(rl.cursor);
        return setCurrentValue(rl.line);
      }
      if (status === "writing") {
        setCursorPositionX(rl.cursor);
        return setCurrentValue(rl.line);
      }

      if (isNumberKey(key)) {
        // Adjust index to start at 1
        const newCursorPosition = Number(key.name) - 1;
        if (!isSelectableChoice(choices[newCursorPosition])) {
          return;
        }
        setCurrentValue(values[newCursorPosition]);
        return setCursorPos(newCursorPosition);
      }
      if (isUpKey(key) || isDownKey(key)) {
        const offset = isUpKey(key) ? -1 : 1;
        let newCursorPosition = cursorPosition;
        let selectedOption;

        while (!isSelectableChoice(selectedOption)) {
          newCursorPosition += offset + choices.length;
          newCursorPosition %= choices.length;
          selectedOption = choices[newCursorPosition];
        }

        setCurrentValue(values[newCursorPosition]);
        return setCursorPos(newCursorPosition);
      }
    });

    let message: string = chalk.bold(config.message);
    let cursor = ansiEscapes.cursorHide;
    if (firstRender.current) {
      cursor = ansiEscapes.cursorSavePosition;
      message += chalk.dim(" (Use arrow keys)");
      firstRender.current = false;
    }
    if (status === "writing-start") {
      cursor =
        ansiEscapes.cursorRestorePosition +
        ansiEscapes.cursorShow +
        ansiEscapes.cursorUp(choices.length) +
        ansiEscapes.cursorForward(22);
    }
    if (status === "writing") {
      cursor =
        ansiEscapes.cursorRestorePosition + ansiEscapes.cursorForward(22);
    }
    const addCursor = (str: string, position: number) => {
      return (
        str.slice(0, position) +
        chalk.cyan("\u001b[6m|\u001b[25m") +
        str.slice(position)
      );
      // return str.slice(0, position) + "\u007C" + str.slice(position);
      // return str.slice(0, position) + chalk.hex("#eebb00")(cursor(str.at(position) ?? "")) + str.slice(position + 1);
    };
    const allChoices = choices
      .map((choice, index): string => {
        const { pretty } = config;
        let choiceValue =
          index === cursorPosition ? currentValue : values[index];
        if (pretty) {
          const { capitalize, underscoresToSpaces } = pretty;
          if (capitalize) {
            if (capitalize === "first") {
              choice = choice.replace(/^[A-z]/, (c) => c.toUpperCase());
            } else if (capitalize === "allInitials") {
              choice = choice.replace(/\b[A-z]/, (c) => c.toUpperCase());
            } else {
              choice = choice.toUpperCase();
            }
          }
          if (underscoresToSpaces) choice = choice.replace(/_/, " ");
        }
        if (choice !== doneLabel && choice !== cancelLabel) choice += ":";
        if (index !== cursorPosition) return `    ${choice} ${choiceValue}`;
        // if (status === "writing") {
        //   choiceValue = addCursor(choiceValue, cursorPositionX);
        // }
        return COLORS.select(
          padEnd(
            `${figures.pointer}   ${choice} ${choiceValue}`,
            CONSOLE_WIDTH,
          ),
        );
      })
      .join("\n");

    const windowedChoices = inquirer.usePagination(allChoices, {
      active: cursorPosition,
      pageSize: config.pageSize,
    });
    if (status === "writing" || status === "writing-start") {
      message += " Writing...";
    }
    let prefixed_message =
      status === "done"
        ? ` ${chalk.green(figures.circleFilled)} ${message}`
        : ` ${chalk.yellow(figures.circleFilled)} ${message}`;

    const bottomMargin = chalk.underline(padEnd("", CONSOLE_WIDTH));
    if (status === "done") {
      return ` ${chalk.green(figures.circleFilled)} ${doneMessage}`;
    }
    return `${prefixed_message}\n${windowedChoices}\n${bottomMargin}${cursor}`;
  },
);
