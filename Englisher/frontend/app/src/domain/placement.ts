import { apiGet } from '../lib/apiClient';

// GET /api/placement — public, since the test runs before there is an
// account. Replaces PlacementTest.tsx's hardcoded QUESTIONS/STAGE_NAMES/
// STAGE_MESSAGES constants, which had already drifted from
// CURRICULUM_DEFAULT's stage titles (SPRINGBOOT-MIGRATION.md section 7,
// rule 6) — the server now resolves each question's 1-based stage number to
// the real curriculum stage id, so a reorder in the editor cannot silently
// break the mapping.

export type PlacementQuestion =
  | { stage: number; type: 'choice'; prompt: string; options: string[]; correct: string }
  | { stage: number; type: 'translate'; prompt: string; sinhala: string };

export interface PlacementStageCopy {
  stage: number;
  name: string;
  message: string;
  /** The curriculum stage this placement result maps to — null if stages have been reordered since seeding. */
  stageId: string | null;
}

export interface Placement {
  questions: PlacementQuestion[];
  stages: PlacementStageCopy[];
}

export function loadPlacement(): Promise<Placement> {
  return apiGet<Placement>('/api/placement');
}
