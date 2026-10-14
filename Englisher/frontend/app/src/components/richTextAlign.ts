import { getHTMLFromFragment } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import ParagraphExt from '@tiptap/extension-paragraph';
import HeadingExt from '@tiptap/extension-heading';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import type { Node as PMNode } from '@tiptap/pm/model';

// There is no markdown syntax for text alignment in any flavor, so a plain
// paragraph/heading serializer would silently drop it on every save/reload.
// When `textAlign` is set, fall back to a raw HTML block instead — the same
// escape hatch tiptap-markdown's own Table serializer uses for content it
// can't express as plain markdown. TextAlign's own `parseHTML` reads the
// `style="text-align:…"` straight back into the attribute when that block
// is parsed again, and nested marks (bold/links/…) still render correctly
// since getHTMLFromFragment serializes the real node — attrs and all —
// through the schema, not raw text.
function alignedBlockHTML(node: PMNode): string {
  const html = getHTMLFromFragment(Fragment.from(node), node.type.schema);
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const el = dom.body.firstElementChild;
  if (!el) return html;
  // An empty block needs a visible placeholder or it collapses to nothing.
  el.innerHTML = el.innerHTML.trim() ? `\n${el.innerHTML}\n` : '\n&nbsp;\n';
  return el.outerHTML;
}

type NodeSerializeFn = (state: MarkdownSerializerState, node: PMNode, parent: PMNode, index: number) => void;

function alignAware(plain: NodeSerializeFn): NodeSerializeFn {
  return function serialize(this: { editor: { storage: { markdown: { options: { html: boolean } } } } }, state, node, parent, index) {
    const htmlMode = this.editor.storage.markdown.options.html;
    if (!node.attrs.textAlign || !htmlMode) {
      plain(state, node, parent, index);
      return;
    }
    // `text(…, false)` writes line by line, so inside a list item every line of
    // the HTML block gets the item's continuation indent. A plain `write()` only
    // indents the first line, which pulled the rest out of the list item and
    // rendered each bullet as an empty marker plus a loose paragraph.
    state.text(alignedBlockHTML(node), false);
    state.closeBlock(node);
  };
}

// Markdown drops what a writer typed on purpose: an empty paragraph vanishes
// (so blank lines collapse), and a paragraph's leading/trailing spaces are
// trimmed on parse. `&nbsp;` is the one spelling that survives that — markdown-it
// only decodes entities after it has trimmed. So blank paragraphs, edge spaces
// and any literal non-breaking space are all written as `&nbsp;`. Spaces in the
// middle of a line already survive (see `white-space: pre-wrap` in global.css).
const NBSP = '&nbsp;';

function preserveParagraph(state: MarkdownSerializerState, node: PMNode): void {
  const text = node.textContent;
  if (node.content.size === 0) {
    state.write(NBSP);
    state.closeBlock(node);
    return;
  }
  if (text && !/\S/.test(text.replace(/ /g, ' ')) && node.childCount === 1) {
    state.write(NBSP.repeat(text.length));
    state.closeBlock(node);
    return;
  }
  state.write(); // flush the previous block and write any list/quote indent
  const start = state.out.length;
  state.renderInline(node);
  const line = state.out.slice(start)
    .replace(/ /g, NBSP)
    .replace(/^ +/, (m) => NBSP.repeat(m.length))
    .replace(/ +$/, (m) => NBSP.repeat(m.length));
  state.out = state.out.slice(0, start) + line;
  state.closeBlock(node);
}

export const AlignAwareParagraph = ParagraphExt.extend({
  addStorage() {
    return { markdown: { serialize: alignAware(preserveParagraph), parse: {} } };
  },
});

/**
 * The aligned-block serializer above wraps a block's content in newlines
 * (`<p style=…>\ncontent\n</p>`). Harmless when whitespace collapses, but now
 * that whitespace is preserved they would show up as extra blank lines — so
 * strip them wherever stored markdown (or its rendered HTML) is read back.
 */
export function stripAlignedBlockPadding(src: string): string {
  return src
    .replace(/(<(?:p|h[1-3])\b[^>]*>)\r?\n/g, '$1')
    .replace(/\r?\n(<\/(?:p|h[1-3])>)/g, '$1');
}

export const AlignAwareHeading = HeadingExt.extend({
  addStorage() {
    return { markdown: { serialize: alignAware(defaultMarkdownSerializer.nodes.heading), parse: {} } };
  },
});
