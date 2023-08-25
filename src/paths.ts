import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_PATH = path.join(__dirname, "..");
export const TEMP_PATH: string = path.join(PROJECT_PATH, ".temp");
export const CONFIG_SCHEMA_PATH: string = path.join(
  PROJECT_PATH,
  ".config.schema.yaml",
);

export default {
  PROJECT_PATH,
  TEMP_PATH,
  CONFIG_SCHEMA_PATH,
};
