import { Link } from 'react-router-dom';

// Required before applying to Google AdSense (which won't review a site
// without one reachable), and needed regardless — the app already collects
// accounts, parent-child links and writing submissions. See the "Ads on
// Englisher" write-up's "before you apply" checklist.
//
// English only, deliberately: a policy page is a legal document, and a
// partial or machine-shaped Sinhala translation would be worse than none —
// unlike the rest of the app, this is not ported to `lang`/`isSi`.

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'What this covers',
    body: [
      'This policy explains what Englisher collects when you use the site, why, and who can see it. It applies to the student, parent and admin accounts the app supports.',
    ],
  },
  {
    heading: 'Account information',
    body: [
      'When you sign up, we store your name, email address and a securely hashed password (or, if you sign in with Google or Facebook instead, the profile info those providers share with us — your name, email and a provider account id — and never your password on either service).',
      'Your account is tied to one role: student, parent or admin. A parent account never gets your login and never signs up on its own — a student invites a parent by email or phone, and the parent account it creates is separate from the student\'s.',
    ],
  },
  {
    heading: 'Learning progress',
    body: [
      'We record what you\'d expect from a course: which lessons and exercises you\'ve completed, your answers to graded exercises (so you can review them later), XP, coins, streaks and your current stage. This is what makes the roadmap, the review screens and your progress page work.',
      'If you try a lesson before creating an account ("guest" mode), that one lesson\'s progress lives only in your browser until you sign up — nothing is sent to our servers until then.',
    ],
  },
  {
    heading: 'Writing submissions',
    body: [
      'The guided essay, solo essay and formal letter tasks store what you write, so you can come back to a draft and so a linked parent account can see that you\'re practicing. A parent only ever sees a short excerpt of a submission, never the full text, and never your individual exercise answers or mistakes — see "Parent access" below.',
    ],
  },
  {
    heading: 'Parent access',
    body: [
      'A student can invite a parent to a read-only view of their progress: total XP, streak, which stage they\'re on, and a short excerpt of recent writing. A parent cannot see individual questions, answers, or full essay text. The student controls this: they send the invitation, and can remove a connected parent\'s access at any time from their profile.',
      'Because some of our learners are minors, we do not run behavioral or cross-site tracking on this data, and it is never used for ad targeting.',
    ],
  },
  {
    heading: 'Cookies and sign-in',
    body: [
      'Staying signed in relies on one httpOnly cookie holding a refresh token, which JavaScript on the page can never read — it exists purely so your browser can quietly renew your session. We don\'t use it, or any other cookie, to track you across other websites.',
    ],
  },
  {
    heading: 'Advertising',
    body: [
      'Englisher does not currently show ads. If that changes, any ad shown to you will be non-personalized — no behavioral profiling, no remarketing, no cross-site tracking — because a real share of our learners are children, and we treat the whole site as child-directed rather than trying to tell adult and minor visitors apart. This section will be updated, and the change called out, before any ad ever appears.',
    ],
  },
  {
    heading: 'Children\'s privacy',
    body: [
      'Some Englisher accounts belong to children learning English with a parent\'s awareness through the parent-access feature above. We collect the minimum needed to run the course — no more than any other student account — and we don\'t serve personalized ads or do behavioral tracking on any account, adult or child, precisely so we don\'t have to tell the difference to stay careful. A parent linked to a child\'s account can ask us to review or remove what\'s stored for that account at any time — see "Contact" below.',
    ],
  },
  {
    heading: 'What we don\'t do',
    body: [
      'We don\'t sell your data. We don\'t share it with third parties for their own marketing. We don\'t use your essays, letters or exercise answers for anything other than showing them back to you (and, in excerpt form, to a parent you\'ve linked).',
    ],
  },
  {
    heading: 'Your choices',
    body: [
      'You can review and correct your name and password from your Profile page at any time. A student can revoke a parent\'s access at any time. To have your account and its data deleted, or to ask what\'s stored for a linked child\'s account, contact us using the details below.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Questions about this policy, or a request to access or delete your data, can be sent to the address below.',
    ],
  },
];

export function Privacy() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand">
          <div className="site-nav__mark"><div className="site-nav__mark-dot" /></div>
          <span className="site-nav__wordmark">Englisher</span>
        </Link>
        <Link to="/" style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-ink-soft)' }}>Back to Englisher</Link>
      </nav>

      <div className="home-shell" style={{ maxWidth: 760, margin: '0 auto', paddingTop: 40, paddingBottom: 88 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, margin: '0 0 8px' }}>Privacy Policy</h1>
        <p style={{ margin: '0 0 40px', fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600 }}>Last updated: not yet published — this page ships with the app but hasn't gone live on a real domain yet.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 10px' }}>{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0', fontSize: 15, lineHeight: 1.7, color: 'var(--c-ink-2)' }}>{p}</p>
              ))}
            </section>
          ))}

          <section className="card" style={{ border: '1px solid var(--c-line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-warning-ink)', background: 'var(--c-warning-bg)', display: 'inline-block', padding: '4px 10px', borderRadius: 999, marginBottom: 10 }}>TODO before this goes live</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--c-ink-2)' }}>
              Replace this box with a real contact email and a "last updated" date once the app is hosted on its real domain — AdSense (and this policy) both need an address that actually receives mail, not the <code style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 5, padding: '1px 6px', fontSize: 13 }}>no-reply@englisher.test</code> placeholder used for outgoing system email.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
