#!/usr/bin/env node
import "./setup";
// import { args } from "./args"
import { CLIApp } from "@models/CLIApp";
import { RegistryHandler } from "@models/RegistryHandler";
import { CONSOLE_WIDTH } from "@constants";
import chalk from "chalk";
import { ConfigHandler } from "@models/ConfigHandler";
import inquirer from "inquirer";
import { docker } from "@cli";
import { CONFIG_SCHEMA_PATH } from "@paths";
import { DockerUnavailableError } from "./errors/DockerUnavailableError";
import PaginatedList from "@models/PaginatedList";
import { Stream } from "stream";

const app = CLIApp.createApp({
  appName: "Registry V2 CLI",
  author: "Felipe Ribeiro Lobato",
});

const configHandler = new ConfigHandler({
  projectName: "docker-registry-v2-cli",
  schemaPath: CONFIG_SCHEMA_PATH,
});

const commandsStream = new Stream.Writable({
  write: (data: Buffer, _, next) => {
    const line = data.toString();
    if (line.trim()) app.pushLine(line, "command");
    next();
  },
});
const verboseCommandsStream = new Stream.Writable({
  write: (data: Buffer, _, next) => {
    const line = data.toString();
    if (line.trim()) app.pushLine(line, "success");
    next();
  },
});

app.showBanner();

let lastOption = "";
while (true) {
  const dockerEngineAvailable = await docker.available();
  const { registryAddress } = configHandler.getConfig();
  app.pushSeparator("upper");
  app.pushLine("Connected to: " + registryAddress, "section");
  app.pushLine();

  const option = await app.prompt.select({
    choices: [
      "List",
      !dockerEngineAvailable
        ? chalk.dim("Push [Disabled: Docker Not Available]")
        : "Push",
      !dockerEngineAvailable
        ? chalk.dim("Remove [Disabled: Docker Not Available]")
        : "Remove",
      "Config",
      "Test Connection",
      "Exit",
    ],
    default: lastOption,
    message: "Choose a command to execute:",
    pageSize: 10,
  });
  lastOption = option;

  if (option === "Config") {
    const result = await inquirer.prompt({
      type: "editor",
      name: "Configuration",
      default: configHandler.getConfigAsString(),
    });

    configHandler.editConfig(result.Configuration);
    continue;
  }

  if (option === "Exit") app.exit();

  const config = configHandler.getConfig();
  try {
    const registryHandler = await RegistryHandler.createHandler({
      ...config,
      stream: commandsStream,
      verboseStream: config["verbose"] ? verboseCommandsStream : undefined,
    });

    if (option === "Test Connection") {
      const { registryAddress, registryVersion } = registryHandler;
      app.pushLine();
      app.pushLine(
        `Connection successfull at ${registryAddress}`,
        "success",
        "center"
      );
      app.pushLine(`Registry Version: ${registryVersion}`, "success", "center");
      app.pushLine();
      continue;
    }

    if (option === "List") {
      const imageList = await registryHandler.getImageList();
      await PaginatedList({
        title: { even: "Registry Catalog", odd: "Registry  Catalog" },
        list: imageList.reduce(
          (acc, { name, tags }) => [...acc, [name, tags]],
          [] as [string, string[]][]
        ),
        message: "List",
        pageSize: 5,
      });
      continue;
    }
    if (option === "Push") {
      const source = await app.prompt.select({
        choices: [
          "Local Built Image",
          "Dockerfile",
          "Git Repository",
          "Cancel",
        ],
        message: "Please select the image source",
      });
      if (source === "Cancel") continue;
      const options = {
        gitUrl: "",
        dockerfilePath: "",
      };

      if (source === "Dockerfile") {
        options.dockerfilePath = await app.prompt.input({
          message: " Dockerfile path:",
          line_width: CONSOLE_WIDTH,
        });
      }
      if (source === "Git Repository") {
        options.gitUrl = await app.prompt.input({
          message: " Git Repository url:",
          line_width: CONSOLE_WIDTH,
        });
      }

      let imageName = await app.prompt.input({
        message: " Image name (repo:tag):",
        line_width: CONSOLE_WIDTH,
      });

      imageName = imageName.replace(
        `${registryHandler.registryAddressNoProtocol}/`,
        ""
      );
      console.log(options);
      const result = await registryHandler.pushImage(imageName, options);
      app.pushLine("Repository: " + result.repository, "default");
      app.pushLine("Tag: " + result.tag, "default");
      app.pushLine("Digest: " + result.digest, "default");
    }
    if (option === "Push(Local Image)") {
      let imageName = await app.prompt.input({
        message: " Image name (repo:tag):",
        line_width: CONSOLE_WIDTH,
      });
      imageName = imageName.replace(
        `${registryHandler.registryAddressNoProtocol}/`,
        ""
      );
      const result = await registryHandler.pushImage(imageName);
      app.pushLine("Repository: " + result.repository, "default");
      app.pushLine("Tag: " + result.tag, "default");
      app.pushLine("Digest: " + result.digest, "default");
    }
    // if (option === "Push(From GIT)") {
    //   const gitUrl = await app.prompt.input({
    //     message: " Git Repository url:",
    //     line_width: CONSOLE_WIDTH,
    //   });

    //   let imageName = await app.prompt.input({
    //     message: " Image name (repo:tag):",
    //     line_width: CONSOLE_WIDTH,
    //   });

    //   imageName = imageName.replace(
    //     `${registryHandler.registryAddressNoProtocol}/`,
    //     ""
    //   );
    //   const result = await registryHandler.pushImage(imageName, gitUrl);
    //   app.pushLine("Repository: " + result.repository, "default");
    //   app.pushLine("Tag: " + result.tag, "default");
    //   app.pushLine("Digest: " + result.digest, "default");
    // }
    if (option === "Remove") {
      const imageTag = await app.prompt.input({
        message: "Enter the image name and tag (name:tag):",
      });
      await registryHandler.removeImage(imageTag);
      continue;
    }

    if (option.match(/DOCKER NOT AVAILABLE/i)) {
      throw new DockerUnavailableError();
    }
  } catch (err) {
    const name = (err as Error).name;
    const message = (err as Error).message;
    app.pushLine();
    app.pushLine(name, "error", "center");
    app.pushLine(message, "error", "center");
    app.pushLine();
  }
}
