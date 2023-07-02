export function escapeString(s: string): string {
  s = s.replace(/(?<!\\)\\/g, "\\\\");
  s = s.replace(/(?<!\\)"/g, '\\"');
  return s;
}
