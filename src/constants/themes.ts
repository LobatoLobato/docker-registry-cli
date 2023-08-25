import { CONSOLE_WIDTH } from "@constants";
import { padEnd } from "@util";
import chalk from "chalk";
import gradient from "gradient-string";
import { COLORS } from "./colors";

const { bg, selectBg } = COLORS;

export const THEMES = {
  default: (str: string) => bg(chalk.white(str)),
  error: (str: string) => bg(chalk.redBright(str)),
  warning: (str: string) => bg(chalk.yellowBright(str)),
  success: (str: string) => bg(chalk.green(str)),
  progress: (str: string) => bg(chalk.blue(padEnd(str, CONSOLE_WIDTH))),
  select: (str: string) => selectBg(chalk.yellow(padEnd(str, CONSOLE_WIDTH))),
  header: (str: string) => bg(gradient.pastel.multiline(str)),
  section: (str: string) => bg(str),
  link: (str: string) => chalk.underline.blueBright(str),
  separator_upper: (str: string) => chalk.overline(padEnd(str, CONSOLE_WIDTH)),
  separator_lower: (str: string) => chalk.underline(padEnd(str, CONSOLE_WIDTH)),
  command: (str: string) => bg(chalk.magenta(str)),
};

export type Themes = keyof typeof THEMES;
