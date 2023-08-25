import { padEnd } from "@util";
import * as core from "./PromptCore";
import { COLORS } from "@constants/colors";
import { CONSOLE_WIDTH } from "@constants";
import chalk from "chalk";

type PromptConfig<Config> = Config & core.AsyncPromptConfig;

type PromptView<Value, Config extends core.AsyncPromptConfig> = (
  config: Config & core.ResolvedPromptConfig,
  done: (value: Value) => void,
) => string | [string, string | undefined];

class CancelablePromise<Value> extends Promise<Value> {
  public cancel(): void {}
}
export class Prompt {
  public static createPrompt<Value, Config extends core.AsyncPromptConfig>(
    view: PromptView<Value, Config>,
  ): core.Prompt<Value, Config> {
    return (config: PromptConfig<Config>) => {
      const prompt = core.createPrompt<Value, Config>((config, done) => {
        const prompt_result = view(config, done);
        return this.formatter(prompt_result);
      });

      return this.createCancelablePromise(config, prompt);
    };
  }
  private static formatter(
    promptResult: string | [string, string | undefined],
  ) {
    if (typeof promptResult !== "string") return promptResult.join("");
    const topMargin = chalk.overline(padEnd("", CONSOLE_WIDTH));

    let lines = [topMargin, ...promptResult.split("\n")];
    lines = lines.map((line) => {
      line = padEnd(line, CONSOLE_WIDTH);
      line = COLORS.bg(`|${line}|`);
      return ` ${line}`;
    });

    return `${lines.join("\n")}`;
  }

  private static createCancelablePromise<Value, Config>(
    config: PromptConfig<Config>,
    prompt: core.Prompt<Value, Config>,
  ) {
    return new CancelablePromise<Value>(async (resolve, reject) => {
      await prompt(config).then(resolve).catch(reject);
    });
  }
}

(" \u001b[48;2;52;51;51m|\u001b[48;2;52;51;51m \u001b[33m◉\u001b[39m \u001b[1mChoose a function to execute:\u001b[22m\u001b[2m (Use arrow keys)\u001b[22m                                                          \u001b[49m\u001b[48;2;52;51;51m|\u001b[49m\n\u001b[48;2;52;51;51m\u001b[49m \u001b[48;2;67;67;67m\u001b[33m|❯   List                                                                                                   |\u001b[39m\u001b[49m\n \u001b[48;2;52;51;51m|    Add                                                                                                    |\u001b[49m\n \u001b[48;2;52;51;51m|    Update                                                                                                 |\u001b[49m\n \u001b[48;2;52;51;51m|    Remove                                                                                                 |\u001b[49m\n \u001b[48;2;52;51;51m|    Config                                                                                                 |\u001b[49m\n \u001b[48;2;52;51;51m|    Teste                                                                                                  |\u001b[49m\n \u001b[48;2;52;51;51m|    Exit                                                                                                   |\u001b[49m\u001b[?25l\n \u001b[48;2;52;51;51m|\u001b[4m                                                                                                           \u001b[24m|\u001b[49m");
