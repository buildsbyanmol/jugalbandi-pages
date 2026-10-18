// Paperclip and a notebook companion from the gallery, mixed with our Little Mehfil vector cast.
// Source credits and reuse review: docs/characters.md.
const sheets = {
  'agent-a': { file: 'paperclip', height: 1872 },
  claude: { file: 'paperclip', height: 1872 },
  'agent-b': { file: 'ledger', height: 1872 },
  codex: { file: 'ledger', height: 1872 },
};
export const petAssetNames = [...new Set(Object.values(sheets).map(sheet => `gallery-${sheet.file}-sprite.webp`))];
export function petContents(symbol) {
  const sheet = sheets[symbol];
  if (!sheet) return `<use href="./assets/characters.svg#${symbol}"/>`;
  return `<svg x="17" y="0" width="166" height="180" viewBox="0 0 192 208" style="overflow:hidden"><image class="pet-frames" href="./assets/gallery-${sheet.file}-sprite.webp" width="1536" height="${sheet.height}"/></svg>`;
}
export function hydratePets(root = document) {
  root.querySelectorAll('svg > use').forEach(use => {
    const symbol = use.getAttribute('href')?.split('#')[1];
    if (sheets[symbol]) use.outerHTML = petContents(symbol);
  });
}
