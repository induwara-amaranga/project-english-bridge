import { Fragment } from 'react';
import { parseRich } from '../domain/curriculum';

export function RichText({ src }: { src: string }) {
  const blocks = parseRich(src);
  return (
    <div style={{ fontSize: 16, lineHeight: 1.75 }}>
      {blocks.map((b, i) =>
        b.isImage ? (
          <img key={i} src={b.src} alt={b.alt} style={{ display: 'block', maxWidth: '100%', borderRadius: 12, margin: '0 0 10px' }} />
        ) : (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
            {b.hasMarker && <span style={{ lineHeight: 1.75, color: 'var(--c-primary)', fontWeight: 700, flexShrink: 0 }}>{b.marker}</span>}
            <div style={{ lineHeight: 1.75, minWidth: 0 }}>
              {b.runs.map((r, j) =>
                r.isLink ? (
                  <a key={j} href={r.href} target="_blank" rel="noopener" style={{ fontWeight: r.weight, fontStyle: r.italic, textDecoration: 'underline' }}>{r.text}</a>
                ) : (
                  <Fragment key={j}><span style={{ fontWeight: r.weight, fontStyle: r.italic }}>{r.text}</span></Fragment>
                )
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
