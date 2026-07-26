// ============================================================================
// FREEFLOW — Scripture engine. Loads local flat {book,chapter,verse,text}
// JSON files and builds an in-RAM index for O(1) lookup, same pattern as
// ScriptureFlow's bookIndexes. Supports book/chapter/verse pickers and
// reference search like "John 3:16" or "John 3:16-18" or "John 3".
// ============================================================================

const TRANSLATIONS = {
  en: { label: 'KJV', abbr: 'KJV', file: 'data/english.json', lang: 'en' },
  te: { label: 'Telugu Bible', abbr: 'TEL', file: 'data/telugu-complete.json', lang: 'te' }
  // Add more translations here — same flat schema, drop the file in /data.
};

const cache = {}; // translationCode -> { verses: [], index: { book: { chapter: [ {verse,text}, ... ] } }, books: [] }

export function listTranslations() {
  return Object.entries(TRANSLATIONS).map(([code, t]) => ({ code, label: t.label, abbr: t.abbr }));
}

export async function loadTranslation(code) {
  if (cache[code]) return cache[code];
  const t = TRANSLATIONS[code];
  if (!t) throw new Error(`Unknown translation: ${code}`);
  const res = await fetch(t.file);
  if (!res.ok) throw new Error(`Failed to load ${t.file}: ${res.status}`);
  const verses = await res.json();

  const index = {};
  const books = [];
  for (const v of verses) {
    if (!index[v.book]) { index[v.book] = {}; books.push(v.book); }
    if (!index[v.book][v.chapter]) index[v.book][v.chapter] = [];
    index[v.book][v.chapter].push({ verse: v.verse, text: v.text });
  }
  for (const b of books) {
    for (const c of Object.keys(index[b])) {
      index[b][c].sort((a, z) => a.verse - z.verse);
    }
  }

  cache[code] = { verses, index, books, abbr: t.abbr, lang: t.lang };
  return cache[code];
}

export function getBooks(code) {
  const t = cache[code];
  return t ? t.books : [];
}

export function getChapterCount(code, book) {
  const t = cache[code];
  if (!t || !t.index[book]) return 0;
  return Object.keys(t.index[book]).length;
}

export function getVerseCount(code, book, chapter) {
  const t = cache[code];
  if (!t || !t.index[book] || !t.index[book][chapter]) return 0;
  return t.index[book][chapter].length;
}

export function getChapter(code, book, chapter) {
  const t = cache[code];
  if (!t || !t.index[book] || !t.index[book][chapter]) return [];
  return t.index[book][chapter];
}

export function getVerseRange(code, book, chapter, verseStart, verseEnd) {
  const chapterVerses = getChapter(code, book, chapter);
  return chapterVerses.filter(v => v.verse >= verseStart && v.verse <= verseEnd);
}

// Parses "John 3:16", "1 John 3:16-18", "Psalm 23", "Song of Solomon 2:1-4"
export function parseReference(code, input) {
  const t = cache[code];
  if (!t) return null;
  const raw = input.trim();
  const m = raw.match(/^(.*?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) return null;
  const bookInput = m[1].trim().toLowerCase();
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : null;
  const verseEnd = m[4] ? parseInt(m[4], 10) : verseStart;

  const book = t.books.find(b => b.toLowerCase() === bookInput)
    || t.books.find(b => b.toLowerCase().startsWith(bookInput))
    || t.books.find(b => b.toLowerCase().includes(bookInput));
  if (!book) return null;

  if (verseStart == null) {
    // whole-chapter reference — caller can render as a chapter picker
    return { book, chapter, verseStart: null, verseEnd: null, whole: true };
  }
  return { book, chapter, verseStart, verseEnd, whole: false };
}

export function formatReference(book, chapter, verseStart, verseEnd) {
  if (verseStart == null) return `${book} ${chapter}`;
  if (verseEnd && verseEnd !== verseStart) return `${book} ${chapter}:${verseStart}-${verseEnd}`;
  return `${book} ${chapter}:${verseStart}`;
}

export function joinVerseText(verses) {
  return verses.map(v => v.text.replace(/\{|\}/g, '')).join(' ');
}
