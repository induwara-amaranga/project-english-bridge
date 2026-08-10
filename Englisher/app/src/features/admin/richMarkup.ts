// Ported from Course Editor.dc.html's toolbar (TOOLS / WRAPS / applyMarkup).
// Each button rewrites the raw markup around the current selection. With
// nothing selected it drops in a sample and selects it, so a button press
// always leaves something to type over rather than a bare pair of asterisks.

export type ToolKey = 'bold' | 'italic' | 'link' | 'image' | 'bullets' | 'numbers';

export const TOOLS: { key: ToolKey; label: string; weight: string; fontStyle: string }[] = [
  { key: 'bold', label: 'B', weight: '800', fontStyle: 'normal' },
  { key: 'italic', label: 'I', weight: '600', fontStyle: 'italic' },
  { key: 'link', label: 'Link', weight: '700', fontStyle: 'normal' },
  { key: 'image', label: 'Image', weight: '700', fontStyle: 'normal' },
  { key: 'bullets', label: '• List', weight: '700', fontStyle: 'normal' },
  { key: 'numbers', label: '1. List', weight: '700', fontStyle: 'normal' },
];

const WRAPS: Record<string, { open: string; close: string; sample: string }> = {
  bold: { open: '**', close: '**', sample: 'bold text' },
  italic: { open: '*', close: '*', sample: 'italic text' },
};

export const MARKUP_HINT = '**bold**  ·  *italic*  ·  [text](https://…)  ·  ![caption](assets/photo.png)  ·  - bullet  ·  1. step';

export function applyMarkup(kind: ToolKey, text: string, start: number, end: number): { text: string; from: number; to: number } {
  const sel = text.slice(start, end);

  if (kind === 'bullets' || kind === 'numbers') {
    const from = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    let to = text.indexOf('\n', end);
    if (to < 0) to = text.length;
    const blank = !text.slice(from, to).trim();
    const body = blank ? 'List item' : text.slice(from, to);
    const marked = body.split('\n').map((line) => {
      const bare = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
      return (kind === 'bullets' ? '- ' : '1. ') + bare;
    }).join('\n');
    const next = text.slice(0, from) + marked + text.slice(to);
    const lead = kind === 'bullets' ? 2 : 3;
    return blank
      ? { text: next, from: from + lead, to: from + marked.length }
      : { text: next, from: from + marked.length, to: from + marked.length };
  }

  if (kind === 'image') {
    let at = text.indexOf('\n', end);
    if (at < 0) at = text.length;
    const lead = (at === 0 || !text.slice(0, at).trim()) ? '' : '\n';
    const caption = 'Caption';
    const snippet = lead + '![' + caption + '](assets/mascot_elephant.png)';
    const capAt = at + lead.length + 2;
    return { text: text.slice(0, at) + snippet + text.slice(at), from: capAt, to: capAt + caption.length };
  }

  if (kind === 'link') {
    const body = sel || 'link text';
    const url = 'https://example.com';
    const next = text.slice(0, start) + '[' + body + '](' + url + ')' + text.slice(end);
    const urlAt = start + 1 + body.length + 2;
    return sel
      ? { text: next, from: urlAt, to: urlAt + url.length }
      : { text: next, from: start + 1, to: start + 1 + body.length };
  }

  const w = WRAPS[kind];
  const body = sel || w.sample;
  const next = text.slice(0, start) + w.open + body + w.close + text.slice(end);
  const from = start + w.open.length;
  return { text: next, from, to: from + body.length };
}
