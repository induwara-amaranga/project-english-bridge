import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckboxRow } from '../../components/Primitives';

export interface RubricSection { title: string; items: string[] }

/** Shared shell for Guided Essay / Solo Essay / Formal Letter — three near-identical writing tasks. */
export function WritingTask({ backHref, eyebrow, title, promptEn, promptSi, extra, rubric, textareaPlaceholder = 'Start writing here...', submitLabel }: {
  backHref: string; eyebrow: string; title: string; promptEn: string; promptSi: string;
  extra?: ReactNode; rubric?: RubricSection[]; textareaPlaceholder?: string; submitLabel: string;
}) {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="app-shell" style={{ background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={backHref} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>{eyebrow}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>{title}</div>
          </div>
          <Link to={backHref} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>Go to lessons</Link>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ padding: 26 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 12 }}>PROMPT</div>
          <p style={{ margin: '0 0 10px', fontSize: 17, lineHeight: 1.6, fontWeight: 600 }}>{promptEn}</p>
          <p className="si" style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--c-ink-2)' }}>{promptSi}</p>
        </div>

        {extra}

        <div className="card" style={{ padding: 26 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 14 }}>{rubric ? 'YOUR LETTER' : 'YOUR PARAGRAPH'}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={textareaPlaceholder} style={{ width: '100%', minHeight: rubric ? 260 : 200, fontSize: 16, lineHeight: 1.6, fontFamily: 'var(--font-body)', border: '2px solid var(--c-line)', borderRadius: 14, padding: '16px 18px', outline: 'none', resize: 'vertical' }} />
        </div>

        {rubric && (
          <div className="card" style={{ padding: 26 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 18 }}>SELF-ASSESSMENT RUBRIC</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {rubric.map((section, si) => (
                <div key={si}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{section.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {section.items.map((text, ii) => {
                      const key = `${si}-${ii}`;
                      return <CheckboxRow key={key} checked={!!checked[key]} onToggle={() => toggle(key)}>{text}</CheckboxRow>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link to={backHref} style={{ alignSelf: 'center', background: 'var(--c-primary)', color: 'white', borderRadius: 14, padding: '16px 40px', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-display)', boxShadow: '0 6px 0 var(--c-primary-hover)' }}>{submitLabel}</Link>
      </div>
    </div>
  );
}
