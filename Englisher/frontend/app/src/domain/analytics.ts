import { apiGet } from '../lib/apiClient';

// GET /api/admin/analytics — real aggregates over Progress, replacing the
// prototype's hardcoded ANALYTICS demo object. Same shape, so CourseDashboard
// needed no restructuring, only a different source (SPRINGBOOT-MIGRATION.md
// section 7).

export interface StageAnalytics {
  learners: number;
  completionPct: number;
  avgAccuracyPct: number;
}

export interface Analytics {
  activeLearners: number;
  weeklyActive: number;
  avgSessionMin: number;
  byStage: Record<string, StageAnalytics>;
}

export const EMPTY_ANALYTICS: Analytics = { activeLearners: 0, weeklyActive: 0, avgSessionMin: 0, byStage: {} };

export function loadAnalytics(): Promise<Analytics> {
  return apiGet<Analytics>('/api/admin/analytics');
}
