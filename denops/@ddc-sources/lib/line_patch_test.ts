import { assertEquals, Denops, api, test } from "./deps.ts";
import { byteLength, linePatch } from "./line_patch.ts";

// (1,0)-index, byte
export function searchCursor(
  buffer: string[],
  insert: string,
): { row: number; col: number; completePos: number } {
  const line = buffer.findIndex((text) => text.includes("|"));
  if (line === -1) {
    throw new Error("Invalid buffer: cursor not found");
  }
  const completePos = buffer[line].indexOf("|");
  buffer[line] = buffer[line].replace("|", insert);
  const col = byteLength(buffer[line].slice(0, completePos) + insert);
  return { row: line + 1, col, completePos };
}

async function setup(
  denops: Denops,
  buffer: string,
) {
  const lines = [buffer];
  const { row, col } = searchCursor(lines, "");
  await api.nvim_buf_set_lines(denops, 0, 0, -1, true, lines);
  await api.nvim_win_set_cursor(denops, 0, [row, col]);
}

async function assertLine(
  denops: Denops,
  expectedLine: string,
) {
  const actualLine = await api.nvim_get_current_line(denops);
  assertEquals(actualLine, expectedLine);
}

test({
  name: "single byte line",
  mode: "nvim",
  fn: async (denops) => {
    await setup(denops, "foo|bar");
    await linePatch(denops, 2, 0, "");
    await assertLine(denops, "fbar");
    await linePatch(denops, 0, 2, "");
    await assertLine(denops, "fr");
  },
});

test({
  name: "multi byte line",
  mode: "nvim",
  fn: async (denops) => {
    await setup(denops, "あいう|😀😀😀");
    await linePatch(denops, 2, 0, "");
    await assertLine(denops, "あ😀😀😀");
    await linePatch(denops, 0, 2, "");
    await assertLine(denops, "あ😀😀");
  },
});
