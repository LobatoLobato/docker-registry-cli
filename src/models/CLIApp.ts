import figlet from "figlet";
import { COLORS } from "@constants/colors";
import { chunkString, urlRgxp } from "@util";
import { padEnd, padStart, padX } from "@util/padding";
import SelectPrompt, { SelectConfig } from "./SelectPrompt";
import InputPrompt, { InputConfig } from "./InputPrompt";
import chalk from "chalk";
import { CONSOLE_WIDTH } from "@constants";
import { THEMES } from "@constants/themes";

interface CLIAppOptions {
  appName: string;
  author: string;
}

interface Prompts {
  select: <const A extends ReadonlyArray<string>>(
    config: SelectConfig<A>
  ) => Promise<A[number]>;
  input: (config: InputConfig) => Promise<string>;
}

export class CLIApp {
  private appName: string = "CLI APPLICATION";
  private author: string = "";
  private _banner: string = "";

  private constructor(options: Partial<CLIAppOptions> = {}) {
    Object.assign(this, options);
  }

  public static createApp(options: Partial<CLIAppOptions>): CLIApp {
    const app = new CLIApp(options);
    app.buildBanner();

    return app;
  }

  public showBanner(): void {
    this.pushLine(this._banner, "default", "center");
  }

  private buildBanner(): void {
    const { appName, author } = this;
    const text = figlet.textSync(appName);

    let lines = text.split("\n").map((l) => l.replace(" ", ""));
    if (text.split("\n")[0].length >= CONSOLE_WIDTH) {
      lines = [appName, ""];
    }
    if (author) lines.push(padEnd(` By ${author}`, CONSOLE_WIDTH));

    const header = [
      THEMES.separator_upper(""),
      ...lines.map((line) => THEMES.header(line)),
      "",
    ].join("\n");

    this._banner = header;
  }

  public pushLine(
    string?: string,
    theme?: keyof typeof THEMES,
    alignment?: "center" | "left" | "right"
  ) {
    if (!string) return console.log(this.logFormat(""));
    if (string.includes("\n")) {
      for (const line of string.split("\n")) {
        this.pushLine(line, theme, alignment);
      }
      return;
    }
    string = string.replace(new RegExp(urlRgxp, "g"), THEMES.link);

    const selectedTheme = THEMES[theme ?? "default"];
    string = this.logFormat(selectedTheme(string), alignment);
    process.stdout.write(string + "\n");
  }
  public pushSeparator(type: "upper" | "lower"): void {
    let separator: string;
    if (type === "upper") {
      separator = chalk.overline(padEnd("", CONSOLE_WIDTH));
    } else {
      separator = chalk.underline(padEnd("", CONSOLE_WIDTH));
    }

    process.stdout.write(` ${COLORS.bg(`|${separator}|`)}\n`);
    // console.log();
  }

  private logFormat(
    string: string,
    alignment?: "center" | "left" | "right"
  ): string {
    if (COLORS.remove(string).trimEnd().length > CONSOLE_WIDTH - 4) {
      let chunks = chunkString(string, CONSOLE_WIDTH - 4);
      chunks = chunks.map((chunk) => this.logFormat(chunk));
      return chunks.join("\n");
    }
    string = string.trimEnd();
    switch (alignment) {
      case "right":
        string = padStart(`${string} `, CONSOLE_WIDTH);
        break;
      case "center":
        string = padX(string, CONSOLE_WIDTH);
        break;
      default:
        string = padEnd(` ${string}`, CONSOLE_WIDTH);
        break;
    }
    return ` ${COLORS.bg(`|${string}|`)}`;
  }

  public exit() {
    this.pushSeparator("lower");
    process.exit(0);
  }

  public readonly prompt: Prompts = {
    select: (config) => SelectPrompt({ ...config, ...this.promptBaseConfig() }),
    input: (config) => InputPrompt({ ...config, ...this.promptBaseConfig() }),
  };
  private promptBaseConfig = () => ({
    line_width: CONSOLE_WIDTH,
  });
}
