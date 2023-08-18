import { GetPreviewerArguments } from "https://deno.land/x/ddc_vim@v4.0.4/base/source.ts";
import { Previewer } from "https://deno.land/x/ddc_vim@v4.0.4/types.ts";
import {
  BaseSource,
  DdcGatherItems,
  Denops,
  fn,
  GatherArguments,
  Item as LackItem,
  LineContext,
  linePatch,
  OnCompleteDoneArguments,
} from "./lib/deps.ts";
import { escapeString } from "./lib/strings.ts";

type SomeRequired<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

type Item<T> = SomeRequired<LackItem<T>, "kind" | "user_data">;

// :h luaref-type()
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

type Params = Record<PropertyKey, never>;

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
    return await this.getItems(denops, path);
  }

  private async getItems(
    denops: Denops,
    path: string,
  ): Promise<Item<UserData>[]> {
    if (path.startsWith("vim.fn.")) {
      const input = path.slice(7);
      const functions = await fn.getcompletion(
        denops,
        input,
        "function",
      ) as string[];
      return functions
        .filter((func) => !func.startsWith("<SNR>"))
        .map((func) => func.replace(/\(\)?$/, ""))
        .map((func) => ({
          word: func,
          kind: "function",
          user_data: {
            name: func,
            help_tag: func,
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
      ) as Item<UserData>[];
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

    await denops.call("ddc#skip_next_complete");
  }

  getPreviewer({
    item,
  }: GetPreviewerArguments<Params, UserData>): Previewer {
    const userData = item.user_data;
    if (userData === undefined) {
      return { kind: "empty" };
    }
    return { kind: "help", tag: userData.help_tag };
  }

  params(): Params {
    return {};
  }
}
