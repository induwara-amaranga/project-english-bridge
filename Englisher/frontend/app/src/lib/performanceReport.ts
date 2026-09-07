import type { Curriculum } from '../domain/types';
import { courseScore, scoreOf, type LessonResult } from '../domain/lessonResults';

// The feedback PDF the congratulations screen hands the learner: how they did,
// stage by stage, from the same per-question results the review screens read.
//
// jsPDF is ~350 KB and only this one button needs it, so it is imported inside
// the function — nothing downloads it until someone actually asks for a report.

export interface ReportInput {
  learnerName: string;
  curriculum: Curriculum;
  results: LessonResult[];
  xp: number;
  streakDays: number;
}

const MARGIN = 48;
const INK = '#1E1B2E';
const SOFT = '#6B6580';
const LINE = '#D8D3EE';
const BRAND = '#6C4FF6';

/** Builds the report and hands it to the browser as a download. */
export async function downloadPerformanceReport(input: ReportInput): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const overall = courseScore(input.results);
  const stages = summariseStages(input);

  // ---- Header -------------------------------------------------------------
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageWidth, 96, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Englisher', MARGIN, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Performance report', MARGIN, 66);
  doc.text(formatDate(new Date()), pageWidth - MARGIN, 66, { align: 'right' });
  y = 96 + 40;

  // ---- Who ----------------------------------------------------------------
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(input.learnerName || 'Learner', MARGIN, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(SOFT);
  doc.text(`${input.xp} XP earned  ·  ${input.streakDays}-day streak`, MARGIN, y);
  y += 30;

  // ---- Headline score -----------------------------------------------------
  doc.setDrawColor(LINE);
  doc.setFillColor('#F7F5FF');
  doc.roundedRect(MARGIN, y, contentWidth, 74, 8, 8, 'FD');
  doc.setTextColor(BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text(`${overall.pct}%`, MARGIN + 22, y + 48);
  doc.setTextColor(INK);
  doc.setFontSize(11);
  doc.text('answered correctly', MARGIN + 116, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(SOFT);
  doc.setFontSize(10);
  doc.text(
    `${overall.correct} of ${overall.total} questions across ${input.results.length} lesson${input.results.length === 1 ? '' : 's'}`
      + (overall.skipped > 0 ? `  ·  ${overall.skipped} skipped` : ''),
    MARGIN + 116, y + 52,
  );
  y += 74 + 34;

  // ---- Per-stage table ----------------------------------------------------
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('How each course went', MARGIN, y);
  y += 18;

  const cols = { stage: MARGIN, lessons: MARGIN + 250, correct: MARGIN + 340, pct: pageWidth - MARGIN };
  doc.setFontSize(9);
  doc.setTextColor(SOFT);
  doc.text('COURSE', cols.stage, y);
  doc.text('LESSONS', cols.lessons, y);
  doc.text('CORRECT', cols.correct, y);
  doc.text('SCORE', cols.pct, y, { align: 'right' });
  y += 8;
  doc.setDrawColor(LINE);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 16;

  doc.setFontSize(10);
  for (const stage of stages) {
    // A page break mid-table would otherwise write over the footer.
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.text(truncate(doc, stage.title, 230), cols.stage, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SOFT);
    doc.text(String(stage.lessons), cols.lessons, y);
    doc.text(`${stage.score.correct} / ${stage.score.total}`, cols.correct, y);
    doc.setTextColor(stage.score.pct >= 80 ? '#1F7A44' : stage.score.pct >= 50 ? '#B37E00' : '#B23A20');
    doc.setFont('helvetica', 'bold');
    doc.text(stage.attempted ? `${stage.score.pct}%` : '—', cols.pct, y, { align: 'right' });
    y += 22;
  }

  // ---- What to look at again ---------------------------------------------
  const weakest = stages.filter((s) => s.attempted && s.score.total > s.score.correct)
    .sort((a, b) => a.score.pct - b.score.pct)
    .slice(0, 3);
  if (weakest.length > 0) {
    y += 14;
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Worth another look', MARGIN, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(SOFT);
    for (const stage of weakest) {
      const missed = stage.score.total - stage.score.correct;
      doc.text(`•  ${stage.title} — ${missed} question${missed === 1 ? '' : 's'} to revisit`, MARGIN, y);
      y += 16;
    }
  }

  // ---- Footer -------------------------------------------------------------
  const footerY = doc.internal.pageSize.getHeight() - 44;
  doc.setDrawColor(LINE);
  doc.line(MARGIN, footerY - 14, pageWidth - MARGIN, footerY - 14);
  doc.setFontSize(8.5);
  doc.setTextColor(SOFT);
  doc.text('Scores cover the questions answered in the app, graded the same way the exercises are.', MARGIN, footerY);

  doc.save(`englisher-report-${slug(input.learnerName)}.pdf`);
}

interface StageSummary {
  title: string;
  lessons: number;
  attempted: boolean;
  score: ReturnType<typeof scoreOf>;
}

/** One row per stage that has lessons, in roadmap order. */
function summariseStages({ curriculum, results }: ReportInput): StageSummary[] {
  return curriculum.stages
    .filter((stage) => (stage.lessons || []).length > 0)
    .map((stage) => {
      const outcomes = results.filter((r) => r.stageId === stage.id).flatMap((r) => r.outcomes);
      return {
        title: stage.title.en || stage.id,
        lessons: stage.lessons.length,
        attempted: outcomes.length > 0,
        score: scoreOf(outcomes),
      };
    });
}

/** Keeps a long stage title from running into the next column. */
function truncate(doc: { getTextWidth: (s: string) => number }, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function slug(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'learner';
}
