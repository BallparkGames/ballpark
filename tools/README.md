# Ballpark build tools

Everything that produces the site lives here. Run from `tools/build/`:

```
python3 generate.py     # builds the puzzle bank from datasets.py -> tools/data/
python3 site_build.py   # writes public/ (game + pages) and src/puzzles.json, src/shell.json
```

- `build/datasets.py`: every stat, its source, clues, categories, and the DAILY list (in order; Daily #1 = Nov 9, 2026).
- `build/generate.py`: picks 5-item puzzles (gap rule, no ties), scoring, units.
- `build/site_build.py`: page text (How to play, About, Privacy, Terms, Contact), footer, security headers file.
- `site/template.html`: the game itself (puzzle JSON is injected at `/*PUZZLES*/null`).
- `video/`: scripts that render the social videos (needs `npm i playwright @fontsource/bricolage-grotesque @fontsource/dm-sans` and ffmpeg).
  - `rec.js` + `rec.json` / `teaser.json`: screen-recording style (needs the site served on localhost:8799).
  - `v2.js` + `v2.json`: bold animated style. `render.js`: original slide style.
  - `make_yt.js`: profile picture, YouTube banner, watermark, Facebook cover. `og.js`: link-preview image.
