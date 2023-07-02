import { Denops, fn } from "./deps.ts";
import { LineContext } from "./line_context.ts";

type Position = {
  line: number;
  character: number;
};

type Range = {
  start: Position;
  end: Position;
};

function createRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): Range {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  };
}

export async function linePatch(
  denops: Denops,
  before: number,
  after: number,
  text: string,
): Promise<void> {
  const ctx = await LineContext.create(denops);
  const line = await fn.line(denops, ".") - 1;
  const range = createRange(
    line,
    ctx.character - before,
    line,
    ctx.character + after,
  );
  await denops.call(
    "luaeval",
    `vim.lsp.util.apply_text_edits(_A, 0, "utf-16")`,
    [{ range, newText: text }],
  );
  await setCursor(denops, {
    line,
    character: ctx.character - before + text.length,
  });
}

// (0,0)-index, utf-16
async function setCursor(
  denops: Denops,
  position: Position,
): Promise<void> {
  const lnum = position.line + 1;
  const line = await fn.getline(denops, lnum);
  const col = byteLength(line.slice(0, position.character)) + 1;
  await fn.setpos(denops, ".", [0, lnum, col, 0]);
}

const ENCODER = new TextEncoder();
export function byteLength(str: string): number {
  return ENCODER.encode(str).length;
}
