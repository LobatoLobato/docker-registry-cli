import chalk from "chalk";
import { spawn, SpawnOptions } from "node:child_process";
import Stream, { Readable, Writable } from "node:stream";

export interface AsyncSpawnOptions extends Omit<SpawnOptions, "stdio"> {
  log?: (message: any) => void;
  redirect_stderr?: boolean;
  indent?: number;
  stream?: Stream.Writable;
}
type AsyncSpawnPayload = { output: string; code: number };
type AsyncSpawnReturn =
  | { resolve: AsyncSpawnPayload; reject: null }
  | { resolve: null; reject: Error & { code: number } };

export async function asyncSpawn(
  command: string,
  args: string[],
  options: AsyncSpawnOptions = {}
): Promise<AsyncSpawnReturn> {
  const { log, redirect_stderr, indent, stream } = options;
  try {
    const payload: AsyncSpawnPayload = await new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: "pipe" });
      let output = "";
      const outputStream = new Writable({
        write: (data: Buffer, _, next) => {
          let line = data.toString();
          if (line.trim()) output += line;
          if (line.includes("\n")) {
            line = line
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n");
            stream?.write(line);
          } else {
            stream?.write(`  ${line}`);
          }
          next();
        },
      });

      if (redirect_stderr) process.stderr.pipe(outputStream);
      process.stdout.pipe(outputStream);

      process.on("close", (code) => {
        const payload = { output, code: code ?? 0 };

        code === 0 ? resolve(payload) : reject(payload);
      });
      process.on("error", (error) => {
        const payload = { output: error.message, code: (error as any).code };
        reject(payload);
      });
    });

    return { resolve: payload, reject: null };
  } catch (error) {
    const payload = error as AsyncSpawnPayload;

    return {
      resolve: null,
      reject: {
        name: "Error",
        message: payload.output,
        code: payload.code,
      },
    };
  }
}
