# Intro video (drop-in, no code change)

Files in this folder, picked at runtime (the first one that exists wins):

| Screen | Tried first | Fallback |
| --- | --- | --- |
| Wide screens (≥ 760 px and landscape) | `intro-landscape.mp4` (e.g. 1920×1080) | `intro.mp4` |
| Phones / portrait | `intro-portrait.mp4` (e.g. 1080×1920) | `intro.mp4` |
| `prefers-reduced-motion` | `poster.jpg` (no video, no autoplay) | — |

- Videos: H.264 + AAC MP4, ideally with `-movflags +faststart`. They play muted, inline and in a loop; the Sound button unmutes.
- On desktop the video sits in a sharp frame that follows its real aspect ratio (portrait or landscape) over a blurred, teal-tinted copy; on mobile it covers the screen.
- `poster.jpg`: first frame, shown while loading and instead of the video under reduced motion. Regenerate with
  `ffmpeg -y -i intro.mp4 -map 0:v:0 -frames:v 1 -q:v 2 poster.jpg`.
- The current `intro.mp4` (464×688) and `poster.jpg` come from the designer mockup (`gameflow-bc/intro/`).

The overlay text (4 beats + end card) is HTML, translated through `src/game/i18n-ui.ts` / `src/game/i18n.ts`
(English source in `src/components/game/boite/IntroVideo.tsx`, `INTRO_BEATS`; `*word*` = gold highlight).
Timing (2.8 s per beat, 3.4 s reduced), word stagger (42 ms) and where Skip/Escape go (`SKIP_TO`: end card or game)
are constants at the top of that file.

If no video exists (or no poster, under reduced motion), the game falls back to the illustrated slide intro.
Works for both `npm run dev` (`/intro/…`) and the GitHub Pages build (`/gameFlow/intro/…`): paths use `import.meta.env.BASE_URL`.
