import { assertEquals } from "./deps.ts";
import { escapeString } from "./strings.ts";

Deno.test("escapeString()", () => {
  assertEquals(escapeString(`a"b"c`), `a\\"b\\"c`);
  assertEquals(escapeString(`a\\b\\c`), `a\\\\b\\\\c`);
});
