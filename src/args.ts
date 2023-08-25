import { parse } from "ts-command-line-args";

interface DockerRegistryCLIArgs {
  add: string;
  remove: string;
  update: string;
  list: string;
  help?: boolean;
}

export const args = parse<DockerRegistryCLIArgs>(
  {
    add: String,
    remove: String,
    update: String,
    list: String,
    help: {
      type: Boolean,
      optional: true,
      alias: "h",
      description: "Prints this usage guide",
    },
  },
  {
    baseCommand: "a",
    helpArg: "help",
    headerContentSections: [
      {
        header: "My Example Config",
        content: "Thanks for using Our Awesome Library",
      },
    ],
    footerContentSections: [
      { header: "Footer", content: `Copyright: Big Faceless Corp. inc.` },
    ],
  },
);
