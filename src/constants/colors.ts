import chalk from "chalk";
import gradient from "gradient-string";
import strip_ansi from "strip-ansi";

const remove = (str: string) => strip_ansi(str);
const bg = (str: string) => chalk.bgHex("#343333")(str);
const header = (str: string) => bg(gradient.pastel.multiline(str));
const select = (str: string) => chalk.bgHex("#434343")(chalk.yellow(str));
const selectBg = (str: string) => chalk.bgHex("#434343")(str);
const progress = (str: string) => bg(chalk.yellowBright(str));
export const COLORS = {
  header,
  bg,
  select,
  selectBg,
  progress,
  remove,
};
