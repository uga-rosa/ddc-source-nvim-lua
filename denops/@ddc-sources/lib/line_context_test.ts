import { assertEquals, Denops, api, test } from "./deps.ts";
import { LineContext } from "./line_context.ts";
import { searchCursor } from "./line_patch_test.ts";

async function setup(
  denops: Denops,
  buffer: string,
) {
  const lines = [buffer];
  const { row, col } = searchCursor(lines, "");
  await api.nvim_buf_set_lines(denops, 0, 0, -1, true, lines);
  await api.nvim_win_set_cursor(denops, 0, [row, col]);
}

test({
  name: "single byte line",
  mode: "nvim",
  fn: async (denops) => {
    await setup(denops, "foo|bar");
    const ctx = await LineContext.create(denops);
    assertEquals(ctx.text, "foobar");
    assertEquals(ctx.character, 3);
  },
});

test({
  name: "multi byte line",
  mode: "nvim",
  fn: async (denops) => {
    await setup(denops, "あい😀|う");
    const ctx = await LineContext.create(denops);
    assertEquals(ctx.text, "あい😀う");
    assertEquals(ctx.character, 4);
  },
});
