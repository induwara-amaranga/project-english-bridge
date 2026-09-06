import { apiDelete, apiGet, apiPost } from '../lib/apiClient';
import type { Progress } from './progress';

// ---------------------------------------------------------------------------
// PARENT ACCESS LINK — ported from parent-link.js unchanged in behaviour.
//
// A parent never signs up on their own and is never given the child's login.
// The child invites a parent by email/phone; only after the parent accepts
// does the dashboard unlock. This is now a real `parent_links` row behind
// `/api/parent-links/*` (child side) and `/api/parent/dashboard` (parent
// side) — see SPRINGBOOT-MIGRATION.md section 6.
// ---------------------------------------------------------------------------

export type ParentLinkStatus = 'none' | 'invited' | 'accepted';

export interface ParentLink {
  status: ParentLinkStatus;
  contact: string;
  channel: '' | 'email' | 'phone';
  invitedAt: number | null;
  acceptedAt: number | null;
}

export const PARENT_LINK_DEFAULT: ParentLink = { status: 'none', contact: '', channel: '', invitedAt: null, acceptedAt: null };

// ---------------------------------------------------------------------------
// Child side — ParentAccess.tsx
// ---------------------------------------------------------------------------

export function loadParentLink(): Promise<ParentLink> {
  return apiGet<ParentLink>('/api/parent-links');
}

export function inviteParent(contact: string): Promise<ParentLink> {
  return apiPost<ParentLink>('/api/parent-links/invite', { contact });
}

export function resendParentInvite(): Promise<ParentLink> {
  return apiPost<ParentLink>('/api/parent-links/resend');
}

export function revokeParentLink(): Promise<ParentLink> {
  return apiDelete<ParentLink>('/api/parent-links');
}

// ---------------------------------------------------------------------------
// Parent side — ParentDashboard.tsx
// ---------------------------------------------------------------------------

export interface ChildSubmission {
  stageId: string;
  lessonId: string;
  cardId: string;
  excerpt: string;
  status: string;
  updatedAt: string;
}

/** Everything the parent dashboard needs in one call — see ParentController on the backend. */
export interface ParentDashboardData {
  childName: string;
  stageName: string;
  stageId: string;
  progress: Progress;
  completedStages: number;
  totalStages: number;
  overallPercent: number;
  recentWriting: ChildSubmission[];
}

/** Throws an ApiRequestError with code `parentLink.notLinked` (404) when no child has linked this account yet. */
export function loadParentDashboard(): Promise<ParentDashboardData> {
  return apiGet<ParentDashboardData>('/api/parent/dashboard');
}

/** An invitation goes to exactly one of the two channels — inferred, not asked for twice. */
export function parentContactChannel(value: string): '' | 'email' | 'phone' {
  const v = String(value == null ? '' : value).trim();
  if (!v) return '';
  if (v.indexOf('@') !== -1) return /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v) ? 'email' : '';
  const digits = v.replace(/[\s()\-.]/g, '');
  return /^\+?\d{9,15}$/.test(digits) ? 'phone' : '';
}
