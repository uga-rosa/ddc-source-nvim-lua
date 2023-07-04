import {
  BaseSource,
  DdcGatherItems,
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
    const [path] = ctx.text.slice(0, ctx.character).match(/\w[\w.]*$/) ?? [];
    if (path === undefined) {
      return [];
    }
    const parent = path.split(".");
    parent.pop();

    const items = await denops.call(
      "luaeval",
      `require("ddc-source-nvim-lua").items(_A)`,
      parent,
    ) as Item<Pick<UserData, "key_type">>[];

    return items.map((item) => {
      const help_tag = parent[0] === "vim"
        ? parent[1] === "api" || parent[1] === "fn"
          ? item.word
          : [...parent, item.word].join(".")
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
