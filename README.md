# LoudGod

The Life Recovery Bible (NLT), read aloud in your browser — Old & New Testament, Genesis 1 to Revelation 22. Sibling project to beelieveInYourself, but a bit more serious.

For personal use with your own copy of the book.

## Run it

Needs a static server (browsers block `fetch` on `file://`):

```bash
npx serve            # or: python -m http.server 5173
```

then open the shown URL. Everything is client-side — the read-aloud voice is the browser's built-in speech synthesis (Edge has the best free natural voices on Windows).

## How it works

- `extract.mjs` — parses the unzipped epub HTML (calibre splits) into clean verse JSON. Stateful pass: chapter headings + inline verse-number superscripts drive position; the epub's `vn-Book.Ch.V` note anchors re-sync it authoritatively. Recovery-note commentary, cross-refs, and margin links are stripped — pure scripture only. 66 books / 31,028 verses.
- `data/` — one JSON per book (`[[{v, t}, ...], ...]` = chapters of verses) + `manifest.json`.
- `index.html` — the whole reader. Book/chapter picker, verse-follow + word-follow highlighting, play/pause (space), chapter arrows, speed & voice controls, position remembered in localStorage. Auto-advances chapter → book, so "Start at Genesis 1" will eventually get you to Revelation 22.

## Re-extracting

```bash
# unzip the epub somewhere, then:
node extract.mjs /path/to/unzipped/epub
```
