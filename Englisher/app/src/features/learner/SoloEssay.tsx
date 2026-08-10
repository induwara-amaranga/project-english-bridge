import { WritingTask } from './WritingTask';

const RUBRIC = [
  { title: 'Structure', items: [
    'Did I include an introduction, a middle section, and a conclusion?',
    'Does each paragraph stick to one main idea?',
  ] },
  { title: 'Grammar', items: [
    'Did I stick to the correct tense throughout, without accidentally switching?',
    'Can I highlight at least three complex sentences using because, although, or if?',
  ] },
  { title: 'Vocabulary', items: [
    'Did I avoid repeating the same word more than twice? (try a synonym)',
    'Did I use at least one preposition correctly from Stage 3 (on, in, at, depends on)?',
  ] },
  { title: 'Task fulfilment', items: [
    'Did I answer all three parts of the prompt (past problem, current action, cause)?',
    'Did I use the passive voice at least once for a formal statement?',
  ] },
];

export function SoloEssay() {
  return (
    <WritingTask
      backHref="/learn/solo-essays"
      eyebrow="STAGE 7 · SOLO ESSAY"
      title="Explaining a Problem"
      promptEn="Write a letter explaining a problem that happened yesterday, what you are doing right now to fix it, and why the original problem occurred."
      promptSi="ඊයේ සිදු වූ ගැටලුවක් පැහැදිලි කරමින්, එය විසඳීමට ඔබ දැන් කරන දේ, සහ එම ගැටලුව ඇති වූයේ ඇයි කියා ලියන්න."
      submitLabel="Submit letter"
      rubric={RUBRIC}
    />
  );
}
