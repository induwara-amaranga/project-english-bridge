# Lottie animations

Drop Lottie `.json` files in this folder. `src/lib/animations.ts` discovers
them at build time with Vite's `import.meta.glob`, so **adding an animation is
just adding the file** — there is no manifest to keep in sync, and each file is
code-split into its own chunk that is fetched only when something plays it.

They live under `src/` rather than `public/` precisely for that auto-discovery:
a static folder cannot be listed at runtime, so a `public/animations` version
would need a hand-maintained list of filenames.

## Names that mean something

| File | Used for |
|---|---|
| `correct.json` | Shown in the feedback banner when an answer is right |
| `wrong.json` | Shown in the feedback banner when an answer is wrong |
| `rocket.json` | The roadmap's map-view header and the travel transition to a course's lessons |
| *anything else* | Joins the **celebration pool** |

The celebration pool is what the lesson-complete and course-complete screens
pick from at random, so give it a few options — `confetti.json`,
`trophy.json`, `stars.json`. One file works; more variety just means the
screen looks different each time a learner finishes something. Rocket stays
out of that pool on purpose: it already has a fixed job, and reusing it there
too would make it read as the same moment happening twice.

## Where to get them

[lottiefiles.com](https://lottiefiles.com) — download as "Lottie JSON" (not
`.lottie`, not the dotLottie player embed). Keep them lean; a celebration
above roughly 300 KB is worth swapping for a simpler one.

## Nothing breaks while this folder is empty

Every screen that plays an animation falls back to a drawn badge, so the app
looks finished before you add a single file. Add them whenever.
