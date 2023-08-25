import fs from "node:fs";
import yaml from "yaml";
import Conf from "conf";
import changeCase from "change-case";

interface Configuration extends Record<string, any> {
  registryAddress: string;
  gitCredentials: {
    username: string;
    accessToken: string;
  };
}

interface ConfigHandlerProps {
  projectName: string;
  schemaPath: string;
}

export class ConfigHandler {
  private readonly config: Conf<Configuration>;

  public constructor(props: ConfigHandlerProps) {
    const file = fs.readFileSync(props.schemaPath, "utf-8");
    const schema = yaml.parse(file);

    this.config = new Conf({
      projectName: props.projectName,
      fileExtension: "yaml",
      serialize: yaml.stringify,
      deserialize: yaml.parse,
      schema,
    });
  }

  public editConfig(configYaml: string): void;
  public editConfig(config: Partial<Configuration>): void;
  public editConfig(config: Partial<Configuration> | string): void {
    if (typeof config === "string") {
      config = yaml.parse(config) as Configuration;
    }

    for (let key in config) {
      key = changeCase.snakeCase(key);
      if (config[key] !== undefined) this.config.set(key, config[key]);
    }
  }

  public getConfig(): Configuration {
    const config = JSON.stringify(this.config.store, (_, value) => {
      if (typeof value !== "object") return value;

      const replacement: Record<string, unknown> = {};
      for (const key in value) {
        if (Object.hasOwnProperty.call(value, key)) {
          replacement[key && changeCase.camelCase(key)] = value[key];
        }
      }
      return replacement;
    });

    return JSON.parse(config);
  }

  public getConfigAsString(): string {
    return yaml.stringify(this.config.store);
  }
}
