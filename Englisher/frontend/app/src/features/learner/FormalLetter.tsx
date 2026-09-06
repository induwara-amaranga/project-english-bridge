import { WritingTask } from './WritingTask';

const RUBRIC = [
  { title: 'Structure', items: [
    'Does my letter have a clear opening, body, and closing?',
    'Did I use a formal greeting and sign-off (Dear... / Yours sincerely)?',
  ] },
  { title: 'Grammar', items: [
    'Did I use reference words (this, these issues, such problems) to connect sentences instead of leaving them isolated?',
    'Did I stay in a consistent tense throughout?',
  ] },
  { title: 'Vocabulary', items: [
    'Did I avoid casual phrases? (e.g. "I want to talk about..." → "I am writing to discuss...")',
    'Did I use at least one logical link word (therefore, as a result, consequently)?',
  ] },
  { title: 'Task fulfilment', items: [
    'Did I clearly explain both the reason and the solution, not just one?',
    'Does the tone stay formal and respectful throughout, not casual?',
  ] },
];

export function FormalLetter() {
  return (
    <WritingTask
      backHref="/learn/formal-letters"
      eyebrow="STAGE 8 · FORMAL LETTER"
      title="Missed Class Letter"
      promptEn="Write a formal letter to your English teacher explaining why you missed an important class, and what steps you are taking to catch up."
      promptSi="වැදගත් පන්තියකට නොපැමිණීමට හේතුව සහ එය පියවා ගැනීමට ඔබ ගන්නා ක්‍රියාමාර්ග පැහැදිලි කරමින් ඔබේ ඉංග්‍රීසි ගුරුවරයාට විධිමත් ලිපියක් ලියන්න."
      submitLabel="Submit letter"
      textareaPlaceholder="Dear..."
      rubric={RUBRIC}
    />
  );
}
