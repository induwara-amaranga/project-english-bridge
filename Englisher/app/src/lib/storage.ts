// Single seam between the app and persistence. Every page goes through this
// module rather than calling localStorage directly, so swapping in a real
// backend (see REACT-MIGRATION.md Phase 8) touches one file, not every page.

export { loadCurriculum as getCurriculum, saveCurriculum as setCurriculum } from '../domain/curriculum';
export { loadProgress as getProgress, saveProgress as setProgress } from '../domain/progress';
export { loadParentLink as getParentLink, saveParentLink as setParentLink } from '../domain/parentLink';
