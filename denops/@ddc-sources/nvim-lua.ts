import {
  BaseSource,
  DdcGatherItems,
  Denops,
  fn,
  GatherArguments,
  Item,
  LineContext,
  linePatch,
  OnCompleteDoneArguments,
} from "./lib/deps.ts";
import { escapeString } from "./lib/strings.ts";

const LuaType = {
  nil: "nil",
  number: "number",
  string: "string",
  boolean: "boolean",
  table: "table",
  function: "function",
  thread: "thread",
  userdata: "userdata",
} as const satisfies Record<string, string>;

type LuaType = keyof typeof LuaType;

type UserData = {
  name: string;
  help_tag: string;
  key_type: LuaType;
};

type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  async gather({
    denops,
  }: GatherArguments<Params>): Promise<DdcGatherItems> {
    const ctx = await LineContext.create(denops);
    if (
      ctx.mode === "c" &&
      await fn.getcmdtype(denops) === ":" &&
      !/^\s*(?:lua|=)/.test(ctx.text)
    ) {
      return [];
    }
    const beforeLine = ctx.text.slice(0, ctx.character);
    const [path] = beforeLine.match(/\w[\w.]*$/) ?? [];
    if (path === undefined) {
      return [];
    }
    const items = await this.getItems(denops, path);

    return items.map((item) => {
      const help_tag = path.startsWith("vim")
        ? /vim\.(?:api|fn)/.test(path)
          ? item.word
          : [...path, item.word].join(".")
        : "";
      return {
        ...item,
        user_data: {
          ...item.user_data,
          name: item.word,
          help_tag,
        },
      };
    });
  }

  private async getItems(
    denops: Denops,
    path: string,
  ): Promise<Item<Pick<UserData, "key_type">>[]> {
    if (path.startsWith("vim.fn.")) {
      const funcName = path.slice(7);
      const functions = await fn.getcompletion(
        denops,
        funcName,
        "function",
      ) as string[];
      return functions
        .filter((func) => !func.startsWith("<SNR>"))
        .map((func) => func.replace(/\(\)?$/, ""))
        .map((func) => ({
          word: func,
          kind: "function",
          user_data: {
            key_type: "string",
          },
        }));
    } else {
      const parent = path.split(".");
      parent.pop();
      return await denops.call(
        "luaeval",
        `require("ddc-source-nvim-lua").items(_A)`,
        parent,
      ) as Item<Pick<UserData, "key_type">>[];
    }
  }

  async onCompleteDone({
    denops,
    userData,
  }: OnCompleteDoneArguments<Params, UserData>): Promise<void> {
    const name = userData.name;
    // Check additional input
    const ctx = await LineContext.create(denops);
    if (!ctx.text.endsWith(`.${name}`, ctx.character)) {
      return;
    }
    if (userData.key_type === LuaType.string && !/\W/.test(name)) {
      return;
    }

    const insertText = userData.key_type === LuaType.string
      ? `["${escapeString(name)}"]`
      : `[${name}]`;
    await linePatch(denops, name.length + 1, 0, insertText);
  }

  params(): Params {
    return {};
  }
}
