import { useEffect, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { AlignAwareHeading, AlignAwareParagraph } from './richTextAlign';

// tiptap-markdown doesn't ship the `@tiptap/core` Storage augmentation
// itself, so `editor.storage.markdown` is untyped without this.
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

// A fuller Tiptap toolbar (headings, underline, strike, highlight, align,
// tables, undo/redo, zoom) than the original six-op replacement for
// richMarkup.ts. Everything still stores plain markdown via tiptap-markdown
// and renders through the same markdown-it pipeline in RichText.tsx.
//
// `html: true` on the Markdown extension below is what lets underline and
// highlight round-trip at all — neither has real markdown syntax, so
// tiptap-markdown falls back to raw HTML (`<u>`, `<mark>`) for them, same as
// its own Table serializer falls back to HTML for tables it can't express
// as pipes. This is safe: the actual security boundary is RichText.tsx's
// *render*-side markdown-it instance, which stays `html: false` — so any
// literal HTML an admin happens to type as plain text still renders as
// inert text to learners, regardless of what the editor itself allows.
const HEADING_LEVELS = [1, 2, 3] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];

const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
const ALIGN_ICON: Record<(typeof ALIGNMENTS)[number], string> = { left: '⟵', center: '↔', right: '⟶', justify: '☰' };

export function RichField({ label, value, onChange, rows = 3, placeholder, si = false }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
  /** Renders the editable text in the Sinhala font — for `.si` fields (e.g. a Sinhala translation), same as the plain `.fld.si` inputs elsewhere. */
  si?: boolean;
}) {
  const [zoom, setZoom] = useState(100);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, heading: false, // replaced below by the alignment-aware versions
        blockquote: false, codeBlock: false, code: false, horizontalRule: false, hardBreak: false,
        underline: {}, strike: {},
        link: { openOnClick: false, autolink: false, defaultProtocol: 'https' },
      }),
      AlignAwareParagraph,
      AlignAwareHeading.configure({ levels: [...HEADING_LEVELS] }),
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Highlight,
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder || '' }),
      Markdown.configure({ html: true, linkify: false, breaks: false, transformPastedText: true }),
    ],
    content: value,
    editorProps: { attributes: { class: si ? 'rt si' : 'rt' } },
    onUpdate: ({ editor: e }) => onChange(e.storage.markdown.getMarkdown()),
  });

  // Bridge the external `value` (a different card selected, or the composer
  // draft reset) into the editor. Guarded by `isFocused` so this doesn't
  // fight the cursor while the user is actively typing here — a keystroke's
  // own onUpdate() sets `value` to what the editor already contains, so the
  // markdown-equality check below is also what keeps that case a no-op.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (editor.storage.markdown.getMarkdown() === (value || '')) return;
    editor.commands.setContent(value || '');
  }, [editor, value]);

  // `useEditor` only re-renders this component on content changes, not on
  // every transaction (e.g. toggling Bold with nothing typed after) — so a
  // click applies instantly (ProseMirror owns the contenteditable directly)
  // but `editor.isActive(...)` read straight in JSX would show stale button
  // states until some unrelated re-render happened to occur. useEditorState
  // subscribes to every transaction and re-renders when this selector's
  // output actually changes.
  const toolbar = useEditorState({
    editor,
    selector: ({ editor: e }) => (!e ? null : {
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      headingLevel: HEADING_LEVELS.find((l) => e.isActive('heading', { level: l })) ?? 0,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      underline: e.isActive('underline'),
      highlight: e.isActive('highlight'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      align: ALIGNMENTS.find((a) => e.isActive({ textAlign: a })),
    }),
  });

  if (!editor || !toolbar) return null;

  const setLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const addImage = () => {
    const src = window.prompt('Image path or URL', 'assets/mascot_elephant.png');
    if (!src) return;
    const alt = window.prompt('Caption (alt text)', 'Caption') || '';
    editor.chain().focus().setImage({ src, alt }).run();
  };

  return (
    <div>
      <label className="lbl">{label}</label>
      <div className="fmtbar">
        <button type="button" className="fmtbtn" disabled={!toolbar.canUndo} onClick={() => editor.chain().focus().undo().run()} title="Undo">↶</button>
        <button type="button" className="fmtbtn" disabled={!toolbar.canRedo} onClick={() => editor.chain().focus().redo().run()} title="Redo">↷</button>

        <span className="fmtbar__sep" />
        <button type="button" className="fmtbtn" onClick={() => setZoom((z) => Math.max(50, z - 10))} title="Zoom out">−</button>
        <span className="fmtbar__zoom">{zoom}%</span>
        <button type="button" className="fmtbtn" onClick={() => setZoom((z) => Math.min(200, z + 10))} title="Zoom in">+</button>

        <span className="fmtbar__sep" />
        <select
          className="fmtselect"
          value={toolbar.headingLevel}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: level as HeadingLevel }).run();
          }}
        >
          <option value={0}>Paragraph</option>
          {HEADING_LEVELS.map((l) => <option key={l} value={l}>Heading {l}</option>)}
        </select>

        <span className="fmtbar__sep" />
        <button type="button" className={`fmtbtn${toolbar.bold ? ' fmtbtn--active' : ''}`} style={{ fontWeight: 800 }} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">B</button>
        <button type="button" className={`fmtbtn${toolbar.italic ? ' fmtbtn--active' : ''}`} style={{ fontStyle: 'italic' }} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">I</button>
        <button type="button" className={`fmtbtn${toolbar.strike ? ' fmtbtn--active' : ''}`} style={{ textDecoration: 'line-through' }} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
        <button type="button" className={`fmtbtn${toolbar.underline ? ' fmtbtn--active' : ''}`} style={{ textDecoration: 'underline' }} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">U</button>
        <button type="button" className={`fmtbtn${toolbar.highlight ? ' fmtbtn--active' : ''}`} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">⬛</button>

        <span className="fmtbar__sep" />
        <button type="button" className={`fmtbtn${toolbar.bulletList ? ' fmtbtn--active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
        <button type="button" className={`fmtbtn${toolbar.orderedList ? ' fmtbtn--active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</button>

        <span className="fmtbar__sep" />
        {ALIGNMENTS.map((a) => (
          <button
            key={a} type="button"
            className={`fmtbtn${toolbar.align === a ? ' fmtbtn--active' : ''}`}
            onClick={() => editor.chain().focus().toggleTextAlign(a).run()}
            title={`Align ${a}`}
          >
            {ALIGN_ICON[a]}
          </button>
        ))}

        <span className="fmtbar__sep" />
        <button type="button" className="fmtbtn" onClick={setLink} title="Link">Link</button>
        <button type="button" className="fmtbtn" onClick={addImage} title="Image">Image</button>
        <button type="button" className="fmtbtn" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">⊞</button>
      </div>
      <div className="richfield-shell" style={{ minHeight: rows * 24 + 16, zoom: `${zoom}%` }} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
