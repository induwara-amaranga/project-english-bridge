import { WritingTask } from './WritingTask';

const STARTERS = [
  { label: 'Opening', phrases: 'One major problem in Sri Lanka is...' },
  { label: 'Adding detail', phrases: 'In addition, ... / Furthermore, ...' },
  { label: 'Contrast', phrases: 'However, ... / On the other hand, ...' },
  { label: 'Cause/effect', phrases: 'As a result, ... / This means that...' },
  { label: 'Suggesting', phrases: 'One solution would be to... / To solve this, we could...' },
  { label: 'Closing', phrases: 'In conclusion, ... / Overall, ...' },
];

export function GuidedEssay() {
  return (
    <WritingTask
      backHref="/learn/guided-essays"
      eyebrow="STAGE 6 · GUIDED ESSAY"
      title="Plastic Pollution in Sri Lanka"
      promptEn="Write a short paragraph about plastic pollution in Sri Lanka. Explain the problem and suggest one solution."
      promptSi="ශ්‍රී ලංකාවේ ප්ලාස්ටික් දූෂණය පිළිබඳ කෙටි ඡේදයක් ලියන්න. ගැටලුව පැහැදිලි කර, විසඳුමක් යෝජනා කරන්න."
      submitLabel="Submit paragraph"
      extra={
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 14 }}>IDEA BANK</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.6 }}>
              <li>Sri Lanka generates about 1.6 million tonnes of plastic waste every year.</li>
              <li>Much of it ends up in rivers and eventually the ocean, harming marine life.</li>
              <li>Many shops and markets have started charging for plastic bags to reduce use.</li>
              <li>Some communities now run weekly clean-up drives on beaches and canals.</li>
            </ul>
          </div>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 14 }}>OUTLINE</div>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.6 }}>
              <li>Introduction — state the problem in one sentence</li>
              <li>Explain why it matters (impact on environment / daily life)</li>
              <li>Give one specific example or fact</li>
              <li>Suggest one solution</li>
              <li>Closing sentence — restate the main idea</li>
            </ol>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 16 }}>SENTENCE STARTERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STARTERS.map((s) => (
                <div key={s.label} style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--c-primary-tint)', color: 'var(--c-primary)', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 999, flexShrink: 0 }}>{s.label}</span>
                  <span style={{ fontSize: 14 }}>{s.phrases}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
