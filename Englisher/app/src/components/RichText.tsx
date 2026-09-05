import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// Cards store real CommonMark now — the same markdown tiptap-markdown
// serializes out of the Tiptap editor in RichTextEditor.tsx. One markdown-it
// instance renders it everywhere it's shown (here, and the Course Editor's
// own preview — see `renderMarkdown` below).
//
// `html: true` is required: underline, highlight and text alignment have no
// markdown syntax, so the editor serializes them as raw HTML (`<u>`,
// `<mark>`, `style="text-align:…"`) — see richTextAlign.ts and the comment
// in RichTextEditor.tsx. That means arbitrary HTML from a card's stored
// text — not just those tags — would otherwise pass straight through to
// `dangerouslySetInnerHTML` below. DOMPurify closes that: only the specific
// tags/attributes this editor can actually produce make it to the DOM;
// anything else (script tags, event handler attributes, iframes, …) is
// stripped. Today every card comes from the same trusted admin editor with
// no real backend, so this mostly guards against a future multi-admin
// backend turning "admin typed something odd" into stored XSS against
// every learner — keep this allowlist in sync with whatever marks/nodes
// RichTextEditor.tsx adds.
const md = new MarkdownIt({ html: true, linkify: false, breaks: false });

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 's', 'u', 'mark', 'a', 'img',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'target', 'rel'],
};

// The only `style` this editor ever produces is `text-align` (see
// richTextAlign.ts) — reject anything else outright rather than trust
// DOMPurify's generic CSS-value sanitizing for a property we don't use.
const SAFE_STYLE = /^text-align:\s*(left|center|right|justify);?$/;
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style' && !SAFE_STYLE.test(data.attrValue.trim())) {
    data.keepAttr = false;
  }
});

export function renderMarkdown(src: string): string {
  return DOMPurify.sanitize(md.render(String(src == null ? '' : src)), SANITIZE_CONFIG);
}

export function RichText({ src, dense = false }: { src: string; dense?: boolean }) {
  return <div className={`rt${dense ? ' rt--dense' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(src) }} />;
}
