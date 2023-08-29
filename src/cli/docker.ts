import { AsyncSpawnOptions, asyncSpawn } from "@util/async_child_process";
import fs from "node:fs";
import path from "node:path";
import stream, { Stream } from "node:stream";
import cliProgress from "cli-progress";
import { THEMES } from "@constants/themes";
import { padEnd } from "@util/padding";
import { CONSOLE_WIDTH } from "@constants";
import ansiEscapes from "ansi-escapes";

const commandRegex =
  /^(FROM|MAINTAINER|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ONBUILD|ARG|STOPSIGNAL|HEALTHCHECK|SHELL)/gim;

const barConfig: cliProgress.Options = {
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

const barPreset = cliProgress.Presets.shades_grey;
// Build steps: 4 steps something + 1 step for each command in docker file
export const docker = {
  build: async (
    imageTag: string,
    dockerfilePath: string,
    options?: { dummy?: boolean; stream?: stream.Writable }
  ) => {
    if (options?.dummy) {
      try {
        fs.mkdirSync(dockerfilePath, { recursive: true });
      } catch (e) {}

      const timeStamp = new Date().getTime();
      const dummyDockerFilePath = path.join(dockerfilePath, "Dockerfile");
      const dummyDockerFile = `FROM alpine:latest\nENTRYPOINT /dummy\nRUN touch ${timeStamp}`;
      fs.writeFileSync(dummyDockerFilePath, dummyDockerFile);
    }

    const file = fs.readFileSync(`${dockerfilePath}/Dockerfile`, "utf-8");
    const totalCommands = (file.match(commandRegex)?.length ?? 0) + 4;

    const bar = new cliProgress.SingleBar(barConfig, barPreset);
    bar.start(totalCommands, 0, { stage: "Building:  " });
    options?.stream?.cork();

    const buildOutputStream = new Stream.Writable({
      write: (data: Buffer, _, cb) => {
        const line = data.toString();
        const progress = parseInt(line.match(/(?<=#)\d+/)?.[0] ?? "0");
        bar.update(progress, { stage: "Building:  " });
        options?.stream?.write(data);
        cb();
      },
    });

    const sOptions: AsyncSpawnOptions = {
      redirect_stderr: true,
      stream: buildOutputStream,
    };

    const dockerBuild = await asyncSpawn(
      "docker",
      ["build", "-t", imageTag, dockerfilePath],
      sOptions
    );

    if (dockerBuild.reject) {
      console.log(ansiEscapes.eraseLines(1));
      console.log(ansiEscapes.cursorUp(1));
      bar.stop();
      options?.stream?.uncork();
      throw dockerBuild.reject;
    }

    bar.update(totalCommands);

    await new Promise((resolve) => setTimeout(resolve, 250));

    bar.stop();
    options?.stream?.uncork();

    return dockerBuild.resolve;
  },
  push: async (imageTag: string, options?: { stream?: stream.Writable }) => {
    const multibar = new cliProgress.MultiBar(barConfig, barPreset);
    const bars = {
      preparing: multibar.create(0, 0, { stage: "Preparing: " }),
      waiting: multibar.create(0, 0, { stage: "Waiting:   " }),
      pushing: multibar.create(0, 0, { stage: "Pushing:   " }),
    } as const;

    options?.stream?.cork();

    const pushOutputStream = new Stream.Writable({
      write: (data: Buffer, _, cb) => {
        const strChunk = data.toString();

        if (strChunk.match(/Preparing/i)) {
          const increment = strChunk.match(/Preparing/gi)?.length ?? 0;

          for (const key in bars) {
            const bar = bars[key as keyof typeof bars];
            const newTotal = bar.getTotal() + increment;
            bar.setTotal(newTotal);
            if (key === "preparing") bar.update(newTotal);
          }
        }
        if (strChunk.match(/Pushed|Layer/i)) {
          const increment = strChunk.match(/Pushed|Layer/gi)?.length ?? 0;
          bars["pushing"].increment(increment);
        }

        if (strChunk.match(/Waiting/i)) {
          const increment = strChunk.match(/Waiting/gi)?.length ?? 0;
          const { pushing } = bars;
          const { waiting } = bars;
          const pushingValue = pushing.getProgress() * pushing.getTotal();
          const waitingValue = waiting.getProgress() * waiting.getTotal();
          const isLagging = pushingValue > waitingValue + increment;

          if (isLagging) {
            waiting.update(pushingValue);
          } else {
            waiting.increment(increment);
          }
        }

        options?.stream?.write(data);
        cb();
      },
    });

    const sOptions: AsyncSpawnOptions = {
      redirect_stderr: true,
      stream: pushOutputStream,
    };

    const dockerPush = await asyncSpawn("docker", ["push", imageTag], sOptions);

    if (dockerPush.reject) {
      console.log(ansiEscapes.eraseLines(3));
      console.log(ansiEscapes.cursorUp(3));
      multibar.stop();
      options?.stream?.uncork();
      throw dockerPush.reject;
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
    options?.stream?.uncork();

    const { output } = dockerPush.resolve;
    const repository = output.match(/(?<=\[).+?(?=\])/)?.at(0) as string;
    const tag = output.match(/.+(?=:\s+digest)/)?.at(0) as string;
    const digest = output.match(/(?<=digest:\s+).+?(?=\s)/)?.at(0) as string;

    return { repository, tag, digest };
  },
  tag: async (sourceImageTag: string, targetImageTag: string) => {
    const dockerTag = await asyncSpawn("docker", [
      "tag",
      sourceImageTag,
      targetImageTag,
    ]);
    if (dockerTag.reject) throw dockerTag.reject;
  },
  rmi: async (imageTag: string) => {
    const dockerRMI = await asyncSpawn("docker", ["rmi", imageTag]);
    if (dockerRMI.reject) throw dockerRMI.reject;
  },
  version: async () => {
    const dockerVersion = await asyncSpawn("docker", ["version"]);
    if (dockerVersion.reject) throw dockerVersion.reject;
  },
  available: async () => {
    const dockerAvailable = await asyncSpawn("docker", ["version"]);
    if (dockerAvailable.reject) return false;
    return true;
  },
};
