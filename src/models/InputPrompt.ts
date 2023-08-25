import { CONSOLE_WIDTH } from "@constants";
import { COLORS } from "@constants/colors";
import { THEMES } from "@constants/themes";
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  isBackspaceKey,
  AsyncPromptConfig,
} from "@inquirer/core";
import type {} from "@inquirer/type";
import { padEnd } from "@util";
import chalk from "chalk";

export type InputConfig = AsyncPromptConfig & {
  default?: string;
  transformer?: (value: string, { isFinal }: { isFinal: boolean }) => string;
  line_width?: number;
};

export default createPrompt<string, InputConfig>((config, done) => {
  const [status, setStatus] = useState<string>("pending");
  const [defaultValue = "", setDefaultValue] = useState<string | undefined>(
    config.default
  );
  const [errorMsg, setError] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>("");

  const line_width = config.line_width ?? 0;
  const isLoading = status === "loading";
  const prefix = usePrefix(isLoading);

  useKeypress(async (key, rl) => {
    // Ignore keypress while our prompt is doing other processing.
    if (status !== "pending") {
      return;
    }

    if (isEnterKey(key)) {
      const answer = value || defaultValue;
      setStatus("loading");
      const isValid = await config.validate(answer);
      if (isValid === true) {
        setValue(answer);
        setStatus("done");
        done(answer);
      } else {
        // Reset the readline line value to the previous value. On line event, the value
        // get cleared, forcing the user to re-enter the value instead of fixing it.
        rl.write(value);
        setError(isValid || "You must provide a valid value");
        setStatus("pending");
      }
    } else if (isBackspaceKey(key) && !value) {
      setDefaultValue(undefined);
    } else if (key.name === "tab" && !value) {
      setDefaultValue(undefined);
      rl.clearLine(0); // Remove the tab character.
      rl.write(defaultValue);
      setValue(defaultValue);
    } else {
      setValue(rl.line);
      setError(undefined);
    }
  });

  const message = chalk.bold(config.message);
  let formattedValue = value;
  if (typeof config.transformer === "function") {
    formattedValue = config.transformer(value, { isFinal: status === "done" });
  }
  if (status === "done") {
    formattedValue = chalk.cyan(formattedValue);
  }

  let defaultStr = "";
  if (defaultValue && status !== "done" && !value) {
    defaultStr = chalk.dim(` (${defaultValue})`);
  }

  let error = "";
  if (errorMsg) {
    error = chalk.red(`> ${errorMsg}`);
  }

  return [
    " " +
      THEMES.default(
        `|${padEnd(
          `${prefix} ${message}${defaultStr} ${formattedValue}`,
          CONSOLE_WIDTH
        )}|`
      ),
    error,
  ];
});
