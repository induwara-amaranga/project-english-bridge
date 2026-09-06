// ---------------------------------------------------------------------------
// THE GLOBAL CURRICULUM OBJECT
//
// This is the single source of truth shared by every page. In production it is
// served by the backend (GET /api/curriculum) and written back by the dashboard
// (PUT /api/admin/curriculum); here it ships as a global so the static
// prototype pages can share one object.
//
// Stage / lesson / exercise ids are stable slugs — NEVER array indices — so
// reordering or renaming content never invalidates a learner's progress rows.
// ---------------------------------------------------------------------------
window.CURRICULUM_DEFAULT = {
  version: 7,
  stages: [
    {
      id: 'tenses', order: 1, title: { en: 'Tenses', si: 'කාල වචන' },
      theme: { from: '#A78BFA', to: '#6C4FF6' },
      unlock: { kind: 'always' },
      lessons: [
        {
          id: 'word-order', order: 1, kind: 'teach',
          title: { en: 'Word order', si: 'වචන අනුපිළිවෙල' },
          explanation: { en: 'English almost always follows Subject → Verb → Object. Sinhala puts the verb last, which is why direct translation feels wrong.', si: '' },
          exercises: [
            {
              id: 'wo-1', type: 'mcq',
              prompt: { en: 'Which sentence has the correct word order?', si: 'නිවැරදි වචන අනුපිළිවෙල ඇති වාක්‍යය කුමක්ද?' },
              feedback: { correct: { en: "Correct! Subject → Verb → Object — that's the English pattern.", si: '' }, incorrect: { en: 'Not quite. In English, the verb comes right after the subject: I eat rice.', si: '' } },
              payload: { options: [{ en: 'I rice eat', si: '' }, { en: 'I eat rice', si: '' }, { en: 'Rice I eat', si: '' }], correctIndex: 1, shuffle: true },
            },
            {
              id: 'wo-2', type: 'drag_order',
              prompt: { en: 'Put the words in the correct order.', si: 'වචන නිවැරදි අනුපිළිවෙලට සකසන්න.' },
              feedback: { correct: { en: 'Exactly — subject, verb, then object.', si: '' }, incorrect: { en: 'Close. Start with who is doing the action.', si: '' } },
              payload: { tokens: [{ en: 'She', si: '' }, { en: 'reads', si: '' }, { en: 'a book', si: '' }] },
            },
          ],
        },
        {
          id: 'present-simple', order: 2, kind: 'practice',
          title: { en: 'Present simple', si: 'වර්තමාන කාලය' },
          explanation: { en: 'Use the base verb with I / you / we / they, and add -s for he / she / it.', si: '' },
          exercises: [
            {
              id: 'ps-1', type: 'gap_fill',
              prompt: { en: 'Complete the sentence.', si: 'වාක්‍යය සම්පූර්ණ කරන්න.' },
              feedback: { correct: { en: "Correct! 'We' takes the base form of the verb.", si: '' }, incorrect: { en: "Almost — with 'we', use the base verb form.", si: '' } },
              payload: { template: { en: 'We ___ English every day.', si: '' }, accept: ['watch'], choices: ['watch', 'watches', 'watching'] },
            },
          ],
        },
      ],
    },
    {
      id: 'complex-sentences', order: 2, title: { en: 'Complex Sentences', si: 'සංකීර්ණ වාක්‍ය' },
      theme: { from: '#6EE7A8', to: '#2FAE63' },
      unlock: { kind: 'afterStage', stageId: 'tenses' },
      lessons: [
        {
          id: 'because-although', order: 1, kind: 'teach',
          title: { en: 'Because & although', si: 'නිසා සහ නමුත්' },
          explanation: { en: 'Joining words let you give a reason or show contrast inside one sentence.', si: '' },
          exercises: [
            {
              id: 'ba-1', type: 'match',
              prompt: { en: 'Match each Sinhala phrase to its English joining word.', si: 'සිංහල වාක්‍ය ඛණ්ඩය ගැළපෙන ඉංග්‍රීසි වචනයට ගළපන්න.' },
              feedback: { correct: { en: 'All matched.', si: '' }, incorrect: { en: 'Some pairs are not matched yet.', si: '' } },
              payload: { pairs: [{ left: 'නිසා', right: 'because' }, { left: 'නමුත්', right: 'although' }, { left: 'නම්', right: 'if' }] },
            },
            {
              id: 'ba-2', type: 'mcq',
              prompt: { en: 'Which sentence uses "because" correctly?', si: '' },
              feedback: { correct: { en: 'Right — "because" needs a full clause after it.', si: '' }, incorrect: { en: '"Because" must be followed by subject + verb.', si: '' } },
              payload: { options: [{ en: 'I was late because traffic.', si: '' }, { en: 'I was late because the traffic was heavy.', si: '' }], correctIndex: 1, shuffle: true },
            },
          ],
        },
      ],
    },
    {
      id: 'translation', order: 3, title: { en: 'Sinhala–English Translation', si: 'සිංහල–ඉංග්‍රීසි පරිවර්තනය' },
      theme: { from: '#4A4560', to: '#2B2740' },
      unlock: { kind: 'afterStage', stageId: 'complex-sentences' },
      lessons: [
        {
          id: 'everyday', order: 1, kind: 'practice',
          title: { en: 'Everyday sentences', si: 'දෛනික වාක්‍ය' },
          explanation: { en: 'Translate meaning, not word by word.', si: '' },
          exercises: [
            {
              id: 'ev-1', type: 'free_text',
              prompt: { en: 'Translate into English: මම පාසැලට යනවා', si: '' },
              feedback: { correct: { en: 'Correct.', si: '' }, incorrect: { en: 'Check your verb form.', si: '' } },
              payload: { accept: ['I go to school', 'I am going to school'], normalize: { lowercase: true, stripPunctuation: true } },
            },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Learner analytics. In production these come from the attempts / progress
// tables (GET /api/admin/analytics) — they are NOT part of the content object,
// because content is edited and analytics are observed.
// Demo figures below.
// ---------------------------------------------------------------------------
window.ANALYTICS = {
  activeLearners: 248,
  weeklyActive: 171,
  avgSessionMin: 12,
  byStage: {
    'tenses':            { learners: 248, completionPct: 62, avgAccuracyPct: 81 },
    'complex-sentences': { learners: 154, completionPct: 34, avgAccuracyPct: 73 },
    'translation':       { learners: 61,  completionPct: 11, avgAccuracyPct: 68 },
  },
};

// ---------------------------------------------------------------------------
// Exercise type registry — the single place a new type is declared for the UI.
// Backend graders and frontend players key off the same `type` string.
// ---------------------------------------------------------------------------
window.TYPE_META = {
  mcq:        { short: 'MCQ',   label: 'Multiple choice' },
  gap_fill:   { short: 'GAP',   label: 'Fill in the blank' },
  drag_order: { short: 'DRAG',  label: 'Drag to order' },
  match:      { short: 'MATCH', label: 'Match pairs' },
  free_text:  { short: 'TEXT',  label: 'Free text' },
};

// ---------------------------------------------------------------------------
// LIGHTWEIGHT MARKUP
//
// Content fields stay plain strings — the API, the graders and the learner
// players all keep working on text. Formatting is a small, deliberate subset
// that survives being read raw in a database row:
//
//   **bold**   *italic*   [text](url)   ![caption](path.png)   - bullet   1. step
//
// Rendering happens only in the preview and, in production, in the learner
// player. Nothing here injects HTML — every run becomes a plain React node — so
// admin-authored text can never smuggle markup into the page.
// ---------------------------------------------------------------------------
// The italic arm requires a non-space right after the opening star, so prose
// like "a * b * c" stays literal instead of turning into stray italics.
var INLINE_RE = /(\*\*[\s\S]+?\*\*|\*[^*\s\n][^*\n]*?\*|!?\[[^\]\n]*\]\([^)\n]*\))/g;

window.mkRun = function (text, bold, italic, href) { return {
  text,
  href: href || '',
  isLink: !!href,
  plain: !href,
  weight: bold ? '700' : '400',
  promptWeight: bold ? '800' : '700', // prompts render bold already
  italic: italic ? 'italic' : 'normal',
}; };

window.inlineRuns = function (text) {
  const runs = [];
  String(text == null ? '' : text).split(INLINE_RE).forEach(part => {
    if (!part) return;
    let m;
    if ((m = /^\*\*([\s\S]+)\*\*$/.exec(part))) runs.push(window.mkRun(m[1], true, false, null));
    else if ((m = /^\*([^*]+)\*$/.exec(part))) runs.push(window.mkRun(m[1], false, true, null));
    // Images are block-level; one written mid-sentence degrades to its caption
    // rather than leaking the raw markup into the preview.
    else if ((m = /^!\[([^\]]*)\]\([^)]*\)$/.exec(part))) runs.push(window.mkRun(m[1], false, false, null));
    else if ((m = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(part))) runs.push(window.mkRun(m[1] || m[2], false, false, m[2]));
    else runs.push(window.mkRun(part, false, false, null));
  });
  return runs;
};

// Markup belongs in the preview, not in a tree row or a heading — those want the
// words only, so `**Which** form?` reads as `Which form?`.
window.plainText = function (src) {
  return window.parseRich(src)
    .map(function (b) { return b.isImage ? (b.alt || '(image)') : b.runs.map(function (r) { return r.text; }).join(''); })
    .join(' ')
    .trim();
};

// One entry per rendered line. Paragraphs and list items share a shape and
// differ only by their marker, which keeps the preview template to one loop.
window.parseRich = function (src) {
  const out = [];
  let counter = 0; // ordered lists are renumbered, so 1. 1. 1. still reads 1. 2. 3.
  String(src == null ? '' : src).split('\n').forEach(raw => {
    const line = raw.trim();
    if (!line) { counter = 0; return; }
    let m;
    if ((m = /^!\[([^\]]*)\]\(([^)]*)\)$/.exec(line))) {
      out.push({ isImage: true, isText: false, src: m[2], alt: m[1] });
      counter = 0;
      return;
    }
    // The marker alone counts as an empty item — a bullet appears the moment it
    // is typed, instead of after the first word.
    if ((m = /^[-*+](?:\s+(.*))?$/.exec(line))) {
      out.push({ isText: true, isImage: false, hasMarker: true, marker: '•', runs: window.inlineRuns(m[1]) });
      counter = 0;
      return;
    }
    if ((m = /^\d+[.)](?:\s+(.*))?$/.exec(line))) {
      counter += 1;
      out.push({ isText: true, isImage: false, hasMarker: true, marker: counter + '.', runs: window.inlineRuns(m[1]) });
      return;
    }
    out.push({ isText: true, isImage: false, hasMarker: false, marker: '', runs: window.inlineRuns(line) });
    counter = 0;
  });
  return out;
};

// ---------------------------------------------------------------------------
// CARDS
//
// Lessons and exercises are both laid out as an ordered list of cards, rendered
// to the learner as a two-column grid. A card holds exactly one thing — a run of
// text, or one interactive exercise type — and says which column it sits in:
//
//   { id, type: 'text', column, body: { en, si } }
//   { id, type: 'mcq' | 'gap_fill' | 'drag_order' | 'match' | 'free_text',
//     column, prompt: { en, si }, payload: {…}, feedback: { correct, incorrect } }
//
//   column: 'left' | 'right' | 'full'   ('full' spans both columns)
//
// `cards` is the source of truth. The pre-cards fields (`lesson.explanation`,
// and an exercise's own `type` / `prompt` / `payload` / `feedback`) are re-derived
// from the cards on every edit, so the dashboard and anything else still reading
// the old shape keeps working.
// ---------------------------------------------------------------------------
window.CARD_COLUMNS = [
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'full', label: 'Full width' },
];

window.emptyPayload = {
  mcq: function () { return { options: [{ en: '', si: '' }, { en: '', si: '' }], correctIndex: 0, shuffle: true }; },
  gap_fill: function () { return { template: { en: '', si: '' }, accept: [], choices: [] }; },
  drag_order: function () { return { tokens: [{ en: '', si: '' }, { en: '', si: '' }] }; },
  match: function () { return { pairs: [{ left: '', right: '' }, { left: '', right: '' }] }; },
  free_text: function () { return { accept: [], normalize: { lowercase: true, stripPunctuation: true } }; },
  text: function () { return {}; },
};

window.makeCard = function (id, type, column) {
  var card = { id: id, type: type, column: column || 'full' };
  if (type === 'text') {
    card.body = { en: '', si: '' };
  } else {
    card.prompt = { en: '', si: '' };
    card.payload = window.emptyPayload[type]();
    card.feedback = { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } };
  }
  return card;
};

// An exercise authored before cards existed becomes a single full-width card of
// its own type; a lesson's explanation becomes a single full-width text card.
window.ensureCards = function (lesson) {
  if (!Array.isArray(lesson.cards)) {
    var explain = lesson.explanation && lesson.explanation.en;
    lesson.cards = explain
      ? [{ id: lesson.id + '-c1', type: 'text', column: 'full',
           body: { en: explain, si: (lesson.explanation.si || '') } }]
      : [];
  }
  (lesson.exercises || []).forEach(function (ex) {
    if (Array.isArray(ex.cards)) return;
    ex.cards = [{
      id: ex.id + '-c1',
      type: ex.type || 'mcq',
      column: 'full',
      prompt: ex.prompt || { en: '', si: '' },
      payload: ex.payload || window.emptyPayload[ex.type || 'mcq'](),
      feedback: ex.feedback || { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } },
    }];
  });
  return lesson;
};

// The exercise's own type/prompt/payload/feedback mirror its first interactive
// card — that is the one a grader and the tree label care about.
window.syncExerciseFromCards = function (ex) {
  var cards = ex.cards || [];
  var primary = null;
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].type !== 'text') { primary = cards[i]; break; }
  }
  if (primary) {
    ex.type = primary.type;
    ex.prompt = primary.prompt;
    ex.payload = primary.payload;
    ex.feedback = primary.feedback;
  } else {
    // A card set with no interactive card yet still needs a label and a type.
    var firstText = cards[0];
    ex.type = 'text';
    ex.prompt = firstText && firstText.body ? firstText.body : { en: '', si: '' };
    ex.payload = {};
    ex.feedback = { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } };
  }
  return ex;
};

window.syncLessonFromCards = function (lesson) {
  var texts = (lesson.cards || [])
    .filter(function (c) { return c.type === 'text'; })
    .map(function (c) { return (c.body && c.body.en) || ''; })
    .filter(Boolean);
  if (!lesson.explanation) lesson.explanation = { en: '', si: '' };
  lesson.explanation.en = texts.join('\n\n');
  (lesson.exercises || []).forEach(window.syncExerciseFromCards);
  return lesson;
};

window.normaliseCurriculum = function (c) {
  c.stages.forEach(function (st) {
    st.lessons.forEach(function (ls) {
      window.ensureCards(ls);
      window.syncLessonFromCards(ls);
    });
  });
  return c;
};

// Grid placement for one card. Left/right pin to a column and let the browser
// pack them into rows in author order; a full-width card spans both, which also
// breaks the run so the two columns stay level after it.
window.cardGridColumn = function (card) {
  if (card.column === 'full') return '1 / -1';
  return card.column === 'right' ? '2' : '1';
};

// ---------------------------------------------------------------------------
// Reordering courses can leave an `afterStage` rule pointing at a course that
// now comes LATER, which would lock both of them forever. Re-point any such rule
// at the immediately preceding course, and open whichever course ended up first.
// Courses set to `always` are left alone — those are open by intent, not by
// position. Shared because both the dashboard and the editor can reorder.
// ---------------------------------------------------------------------------
window.repairUnlocks = function (c) {
  c.stages.forEach(function (st, i) {
    if (!st.unlock || st.unlock.kind !== 'afterStage') return;
    var refIdx = c.stages.findIndex(function (s) { return s.id === st.unlock.stageId; });
    if (refIdx >= 0 && refIdx < i) return;
    st.unlock = i === 0 ? { kind: 'always' } : { kind: 'afterStage', stageId: c.stages[i - 1].id };
  });
};

// ---------------------------------------------------------------------------
// Shared load/save. Stands in for the API calls; falls back to the in-memory
// default when storage is unavailable (e.g. opened straight off the filesystem).
// ---------------------------------------------------------------------------
var KEY = 'englisher.curriculum.draft';

window.loadCurriculum = function () {
  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked — fall through to the default */ }
  return JSON.parse(JSON.stringify(window.CURRICULUM_DEFAULT));
};

window.saveCurriculum = function (c) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
    return true;
  } catch (e) {
    return false;
  }
};
