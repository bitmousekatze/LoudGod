# LoudGod 📖🔊

The Life Recovery Bible (NLT), read aloud in your browser — Old & New Testament, Genesis 1 to Revelation 22, styled like a real book with turning pages. Sibling project to beelieveInYourself, but a bit more serious.

For personal use with your own copy of the book. The Bible text itself is not committed beyond the extracted reading data used by the app.

## Features

- **A real book** — parchment page, stacked page edges, justified serif text, running footer (chapter + page number). Text flows into pages; when the narration reaches the bottom, the page turns itself with a little 3D flip.
- **Read aloud** — browser speech synthesis, voice + speed controls, word-follow highlighting in gold, verse-follow highlighting on the page. Space = play/pause.
- **Recovery notes** — the 2,259 margin notes from the Life Recovery Bible appear as cards on the left/right of the book, on the same page as the ★ marking their verse. Click a star or card: narration pauses, the note is read aloud, then scripture resumes where it left off.
- **Navigation** — book & chapter library (OT/NT), ‹ › page arrows, arrow keys, click any verse to jump, progress bar, deep links (`#John.3`).
- **Remembers you** — last position, voice, and speed persist in localStorage; "Continue" picks up where you stopped. Auto-advances chapter → book, cover to cover.

## Run it

Needs a static server (browsers block `fetch` on `file://`):

```bash
npx serve            # or: python -m http.server 5173
```

Open the shown URL — everything is client-side. Tip: use **Microsoft Edge**; its free "Natural" voices are far better than the stock Windows ones.

## How it works

- `extract.mjs` — parses the unzipped epub HTML (calibre splits) into clean verse JSON. Stateful pass: chapter headings + inline verse-number superscripts drive position; the epub's `vn-Book.Ch.V` note anchors re-sync it authoritatively. Commentary, cross-refs, and margin links are stripped — pure scripture. A second pass extracts the recovery notes and maps them to their verses. **66 books / 31,028 verses / 2,259 notes.**
- `data/` — one JSON per book (`[[{v, t}, ...], ...]`) plus `<Book>.notes.json` and `manifest.json`.
- `index.html` — the entire reader, no dependencies. Pagination is CSS multi-columns (one column = one page) with a translate + rotateY flip animation.

## Re-extracting

```bash
# unzip the epub somewhere, then:
node extract.mjs /path/to/unzipped/epub
```
