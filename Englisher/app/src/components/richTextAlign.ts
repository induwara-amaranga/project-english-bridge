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
  el.innerHTML = el.innerHTML.trim() ? `\n${el.innerHTML}\n` : '\n';
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
    state.write(alignedBlockHTML(node));
    state.closeBlock(node);
  };
}

export const AlignAwareParagraph = ParagraphExt.extend({
  addStorage() {
    return { markdown: { serialize: alignAware(defaultMarkdownSerializer.nodes.paragraph), parse: {} } };
  },
});

export const AlignAwareHeading = HeadingExt.extend({
  addStorage() {
    return { markdown: { serialize: alignAware(defaultMarkdownSerializer.nodes.heading), parse: {} } };
  },
});
