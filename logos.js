// Vendor marks identify the harness; pets remain individual agents.
// The Codex label uses OpenAI's knot. Sources: docs/brand-assets.md.
const marks = { 'Claude Code': 'claude', Codex: 'codex', Cursor: 'cursor' };
export function harnessLogo(name) {
  const mark = marks[name];
  return mark ? `<img class="harness-logo" src="./assets/${mark}-logo.svg" alt="" aria-hidden="true" width="22" height="22">` : '';
}
