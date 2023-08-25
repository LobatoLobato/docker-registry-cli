import { simpleGit, SimpleGitProgressEvent } from "simple-git";
import cliProgress from "cli-progress";
import { padEnd } from "@util";
import { CONSOLE_WIDTH } from "@constants";
import { rmSync } from "fs";
import { THEMES } from "@constants/themes";
import ansiEscapes from "ansi-escapes";

export const git = {
  clone: async (repoPath: string, localPath: string) => {
    const multibarOptions: cliProgress.Options = {
      emptyOnZero: true,
      autopadding: true,
      gracefulExit: false,
      hideCursor: true,
      format: (cfg, params, payload) => {
        const format = "   {stage} | {bar}  | {value}/{total}";
        const config = { ...cfg, format };
        let bar = cliProgress.Format.Formatter(config, params, payload);
        bar = THEMES.progress(padEnd(bar, CONSOLE_WIDTH));
        return ` ${THEMES.default(`|${bar}|`)}`;
      },
    };
    const multibarPreset = cliProgress.Presets.shades_grey;
    const multibar = new cliProgress.MultiBar(multibarOptions, multibarPreset);
    const bars = {
      "remote:": multibar.create(0, 0, { stage: "Remote:    " }),
      receiving: multibar.create(0, 0, { stage: "Receiving: " }),
      resolving: multibar.create(0, 0, { stage: "Resolving: " }),
    } as { [key: string]: cliProgress.SingleBar };

    const git = simpleGit({
      progress: async (data: SimpleGitProgressEvent) => {
        const bar = bars[data.stage];
        bar?.setTotal(data.total);
        bar?.update(data.processed);
      },
    });

    try {
      await git.clone(repoPath, localPath);
    } catch (err) {
      rmSync(localPath, { recursive: true, force: true });
      console.log(ansiEscapes.eraseLines(3));
      console.log(ansiEscapes.cursorUp(3));
      multibar.stop();
      throw err;
    }

    for (const key in bars) {
      const bar = bars[key as keyof typeof bars];
      if (bar.getTotal() > 0) {
        bar.update(bar.getTotal());
        continue;
      }
      bar.setTotal(1);
      bar.update(1);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    multibar.stop();
  },
};
