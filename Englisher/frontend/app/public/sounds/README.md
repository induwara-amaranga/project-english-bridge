# Sound effects

Static UI feedback sounds, served as-is by Vite/Vercel — same reasoning as
`public/assets` for images. Drop the real audio files in here using these
exact names; `src/lib/sounds.ts` references them by path and nothing else
needs to change.

| File | Plays when |
|---|---|
| `correct.mp3` | An exercise answer is checked and graded right |
| `wrong.mp3` | An exercise answer is checked and graded wrong |
| `lesson-complete.mp3` | The last exercise in a lesson is finished |
| `course-complete.mp3` | The last lesson of the last stage is finished |

Keep clips short (under ~1.5s) and normalized to a similar loudness so none
of the four feels jarringly louder than the others. `.mp3` is assumed by the
paths in `sounds.ts` — if you use `.ogg`/`.wav` instead, update the
extensions there.
