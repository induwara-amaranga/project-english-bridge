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
