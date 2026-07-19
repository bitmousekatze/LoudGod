// Extract Bible text from The Life Recovery Bible epub (unzipped calibre HTML splits).
// Usage: node extract.mjs <folder-with-splits>
// Stateful parse: chapter headings (<big>BOOK</big> + number) set position, inline
// <sup> verse numbers advance it, vn-Book.Ch.V anchors re-sync authoritatively.
// Outputs data/<Book>.json + data/manifest.json
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC = process.argv[2] || '/tmp/liferecovery';
const OUT = join(import.meta.dirname, 'data');
mkdirSync(OUT, { recursive: true });

const BOOKS = [ // [vn-abbr, UPPERCASE heading, display name]
  ['Gen','GENESIS','Genesis'],['Exod','EXODUS','Exodus'],['Lev','LEVITICUS','Leviticus'],
  ['Num','NUMBERS','Numbers'],['Deut','DEUTERONOMY','Deuteronomy'],['Josh','JOSHUA','Joshua'],
  ['Judg','JUDGES','Judges'],['Ruth','RUTH','Ruth'],['1Sam','1 SAMUEL','1 Samuel'],
  ['2Sam','2 SAMUEL','2 Samuel'],['1Kgs','1 KINGS','1 Kings'],['2Kgs','2 KINGS','2 Kings'],
  ['1Chr','1 CHRONICLES','1 Chronicles'],['2Chr','2 CHRONICLES','2 Chronicles'],
  ['Ezra','EZRA','Ezra'],['Neh','NEHEMIAH','Nehemiah'],['Esth','ESTHER','Esther'],
  ['Job','JOB','Job'],['Ps','PSALM','Psalms'],['Prov','PROVERBS','Proverbs'],
  ['Eccl','ECCLESIASTES','Ecclesiastes'],['Song','SONG OF SONGS','Song of Songs'],
  ['Isa','ISAIAH','Isaiah'],['Jer','JEREMIAH','Jeremiah'],['Lam','LAMENTATIONS','Lamentations'],
  ['Ezek','EZEKIEL','Ezekiel'],['Dan','DANIEL','Daniel'],['Hos','HOSEA','Hosea'],
  ['Joel','JOEL','Joel'],['Amos','AMOS','Amos'],['Obad','OBADIAH','Obadiah'],
  ['Jon','JONAH','Jonah'],['Mic','MICAH','Micah'],['Nah','NAHUM','Nahum'],
  ['Hab','HABAKKUK','Habakkuk'],['Zeph','ZEPHANIAH','Zephaniah'],['Hag','HAGGAI','Haggai'],
  ['Zech','ZECHARIAH','Zechariah'],['Mal','MALACHI','Malachi'],
  ['Matt','MATTHEW','Matthew'],['Mark','MARK','Mark'],['Luke','LUKE','Luke'],
  ['John','JOHN','John'],['Acts','ACTS','Acts'],['Rom','ROMANS','Romans'],
  ['1Cor','1 CORINTHIANS','1 Corinthians'],['2Cor','2 CORINTHIANS','2 Corinthians'],
  ['Gal','GALATIANS','Galatians'],['Eph','EPHESIANS','Ephesians'],
  ['Phil','PHILIPPIANS','Philippians'],['Col','COLOSSIANS','Colossians'],
  ['1Thes','1 THESSALONIANS','1 Thessalonians'],['2Thes','2 THESSALONIANS','2 Thessalonians'],
  ['1Tim','1 TIMOTHY','1 Timothy'],['2Tim','2 TIMOTHY','2 Timothy'],['Titus','TITUS','Titus'],
  ['Phlm','PHILEMON','Philemon'],['Heb','HEBREWS','Hebrews'],['Jas','JAMES','James'],
  ['1Pet','1 PETER','1 Peter'],['2Pet','2 PETER','2 Peter'],['1Jn','1 JOHN','1 John'],
  ['2Jn','2 JOHN','2 John'],['3Jn','3 JOHN','3 John'],['Jude','JUDE','Jude'],
  ['Rev','REVELATION','Revelation'],
];
const byAbbr = {}, byHeading = {}, ORDER = [];
const ALT = { '1Sm':'1Sam','2Sm':'2Sam','Pr':'Prov','Jonah':'Jon','1Thess':'1Thes','2Thess':'2Thes','1John':'1Jn','2John':'2Jn','3John':'3Jn','Psa':'Ps' };
for (const [ab, up, name] of BOOKS) { byAbbr[ab] = name; byHeading[up] = name; ORDER.push(name); }
for (const [alt, ab] of Object.entries(ALT)) byAbbr[alt] = byAbbr[ab];

function clean(html) {
  return html
    .replace(/^[^<>]*>/, ' ')  // chunk starts mid-tag (token matched inside a tag's attributes)
    .replace(/<[^>]*$/, ' ')   // chunk ends mid-tag
    .replace(/<span class="bold1"><span class="italic">[\s\S]*?<\/span><\/span>/g, ' ') // section headings
    .replace(/<a\b[^>]*href[^>]*>[\s\S]*?<\/a>/g, ' ') // cross-refs, note links, insights/profile margin links
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, ' ')
    .replace(/<small[^>]*>([A-Z]+)<\/small>/g, '$1')   // small-caps LORD / GOD (nested twice)
    .replace(/<small[^>]*>([A-Z]+)<\/small>/g, '$1')
    .replace(/<\/?span[^>]*>/g, '')  // spans are inline styling, never word separators (breaks L|ORD otherwise)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&mdash;/g, '—')
    .replace(/(^|\s)>\s/g, '$1') // stray note-marker '>' glyphs
    .replace(/\s+/g, ' ').trim();
}

const HEADING_NAMES = Object.keys(byHeading).sort((a, b) => b.length - a.length)
  .map(n => n.replace(/ /g, '\\s+')).join('|');
const TOKEN = new RegExp(
  `<big class="calibre16">(${HEADING_NAMES})</big>` +               // 1: chapter heading name
  `|id="vn-([1-3]?[A-Za-z]+)\\.(\\d+)\\.(\\d+)"` +                 // 2,3,4: authoritative anchor
  `|<sup class="calibre21"><small class="calibre10">(\\d+)</small></sup>`, // 5: verse number
  'g');

const files = readdirSync(SRC).filter(f => /_split_\d+\.html$/.test(f))
  .map(f => [f, +f.match(/_split_(\d+)\.html$/)[1]])
  .filter(([, n]) => n <= 1485)   // scripture ends at Rev 22 (~split 1478); rest is notes/index
  .sort((a, b) => a[1] - b[1]).map(([f]) => f);

const bible = {}; // bible[name][ch][v] = text
let cur = null;   // { name, ch, v }
let armed = false; // require a marker in this file before capturing (skips articles/intros)

function put(text) {
  if (!cur || !cur.v || !armed || !text) return;
  const c = ((bible[cur.name] ||= {})[cur.ch] ||= {});
  c[cur.v] = c[cur.v] ? c[cur.v] + ' ' + text : text;
}

for (const f of files) {
  const html = readFileSync(join(SRC, f), 'utf8');
  armed = false;
  let last = 0, pendingHeading = null;
  for (const m of [...html.matchAll(TOKEN)]) {
    const between = html.slice(last, m.index);
    if (pendingHeading) { // look for chapter number right after the heading name
      const num = clean(between.replace(/<[^>]+>/g, ' ')).match(/^\s*(\d+)/);
      cur = { name: pendingHeading, ch: num ? +num[1] : 1, v: 0 };
      pendingHeading = null;
    } else {
      put(clean(between));
    }
    if (m[1]) {           // chapter heading
      pendingHeading = byHeading[m[1].replace(/\s+/g, ' ')];
      armed = true;
    } else if (m[2]) {    // vn anchor — authoritative re-sync
      const name = byAbbr[m[2]];
      if (name) { cur = { name, ch: +m[3], v: +m[4] }; armed = true; }
    } else if (m[5]) {    // sup verse number
      if (cur) { cur.v = +m[5]; armed = true; }
    }
    last = m.index + m[0].length;
  }
  if (pendingHeading) { // heading-only page: chapter number is in the file tail
    const num = clean(html.slice(last).replace(/<[^>]+>/g, ' ')).match(/^\s*(\d+)/);
    cur = { name: pendingHeading, ch: num ? +num[1] : 1, v: 0 };
  } else put(clean(html.slice(last).replace(/<\/body>[\s\S]*$/, '')));
}

// Emit
let verseCount = 0;
const manifest = [];
let testament = 'OT';
for (const name of ORDER) {
  if (name === 'Matthew') testament = 'NT';
  if (!bible[name]) { console.warn('MISSING BOOK: ' + name); continue; }
  const chapters = Object.keys(bible[name]).map(Number).sort((a, b) => a - b);
  const out = [];
  for (let ch = 1; ch <= chapters[chapters.length - 1]; ch++) {
    const verses = bible[name][ch] || {};
    const vnums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    out.push(vnums.map(v => ({ v, t: verses[v].replace(/(^|\s)>(\s|$)/g, ' ').replace(/\bL ORD\b/g, 'LORD').replace(/\bG OD\b/g, 'GOD').replace(/\s+/g, ' ').trim() })));
    verseCount += vnums.length;
  }
  const id = name.replace(/\s+/g, '');
  writeFileSync(join(OUT, id + '.json'), JSON.stringify(out));
  manifest.push({ id, name, chapters: out.length, testament });
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`books: ${manifest.length}, verses: ${verseCount}`);
// spot checks
const gj = JSON.parse(readFileSync(join(OUT, 'Genesis.json')));
console.log('Gen chapters:', gj.length, '| Gen 1 verses:', gj[0].length, '| Gen 1:1:', gj[0][0]?.t.slice(0, 80));
const ps = JSON.parse(readFileSync(join(OUT, 'Psalms.json')));
console.log('Ps chapters:', ps.length, '| Ps 23:', ps[22]?.map(x => x.v).join(','));
const rev = JSON.parse(readFileSync(join(OUT, 'Revelation.json')));
console.log('Rev chapters:', rev.length, '| Rev 22 verses:', rev[21]?.length);
