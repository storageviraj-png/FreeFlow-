import { firebaseConfig, LIVE_STATE_PATH, SONGS_COLLECTION, SLIDES_COLLECTION, IMAGES_COLLECTION } from './config.js';
import {
  initFirebase, watchDoc, writeDoc, collection, addDoc, deleteDoc, getDocs, getDb, doc
} from './firestore-sync.js';
import * as Bible from './bible-engine.js';
import {
  newSlide, newElement, scriptureSlide, lyricsSlide, textSlide, imageSlide,
  announcementSlide, lowerThirdSlide, cloneSlide
} from './slide-model.js';
import { paintSlide } from './render-engine.js';
import { attachEditor } from './editor.js';

// ---------------------------------------------------------------------------
// Config guard
// ---------------------------------------------------------------------------
if (firebaseConfig.apiKey === 'REPLACE_ME') {
  document.getElementById('configErrorScreen').classList.remove('hidden');
  throw new Error('Firebase not configured — see js/config.js');
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
window.toast = function (msg, kind = 'info') {
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-slate-800' };
  el.className = `toast ${colors[kind] || colors.info} text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
};

// ---------------------------------------------------------------------------
// App state (local, mirrors what gets pushed to Firestore live-state doc)
// ---------------------------------------------------------------------------
const state = {
  version: 0,
  slides: [],
  currentIndex: 0,
  blackout: true,
  selectedIndex: null,     // index into state.slides being edited/previewed
  remoteVersion: 0
};

let songsLibrary = [];
let textSlideLibrary = [];
let imageLibrary = [];

// ---------------------------------------------------------------------------
// Firestore live-state sync
// ---------------------------------------------------------------------------
const connStripText = document.getElementById('connStripText');
const connStripVersion = document.getElementById('connStripVersion');

function setConn(text, cls) {
  connStripText.textContent = text;
  document.getElementById('connStrip').className = `w-full px-4 py-1.5 text-[10px] font-bold flex items-center justify-between border-b shrink-0 ${cls}`;
}

let suppressIncoming = false; // true while we're the one who just wrote, avoid re-render loop artifacts

watchDoc(LIVE_STATE_PATH, (data) => {
  setConn('Live — synced to output.html', 'bg-emerald-50 text-emerald-700 border-emerald-200');
  connStripVersion.textContent = data ? `v${data.version}` : '';
  if (!data) return;
  state.remoteVersion = data.version || 0;
  // Only adopt remote slide/index/blackout on first load (when local is empty) —
  // afterwards THIS controller is the source of truth for edits it makes locally,
  // and pushLiveState() is what keeps Firestore in sync going forward.
  if (state.slides.length === 0 && Array.isArray(data.slides)) {
    state.slides = data.slides;
    state.currentIndex = data.currentIndex || 0;
    state.blackout = data.blackout !== false;
    renderPlaylist();
    selectSlide(state.currentIndex);
  }
}, { log: (...a) => { console.log('[FreeFlowController]', ...a); setConn('Reconnecting…', 'bg-amber-50 text-amber-700 border-amber-200'); } });

async function pushLiveState(note) {
  state.version += 1;
  await writeDoc(LIVE_STATE_PATH, {
    version: state.version,
    slides: state.slides,
    currentIndex: state.currentIndex,
    blackout: state.blackout
  });
  if (note) toast(note, 'success');
}

// ---------------------------------------------------------------------------
// Playlist rendering
// ---------------------------------------------------------------------------
const playlistEl = document.getElementById('playlistEl');
const TYPE_ICON = { scripture: '📖', lyrics: '🎵', text: '📝', image: '🖼️', announcement: '📢', lowerThird: '🏷️' };

function renderPlaylist() {
  playlistEl.innerHTML = '';
  state.slides.forEach((slide, i) => {
    const item = document.createElement('div');
    item.className = `playlist-item border rounded-lg p-2 text-xs cursor-pointer bg-white flex items-center gap-2 ${i === state.currentIndex && !state.blackout ? 'live' : ''} ${i === state.selectedIndex ? 'selected' : ''}`;
    item.draggable = true;
    item.dataset.index = i;
    item.innerHTML = `<span>${TYPE_ICON[slide.type] || '•'}</span><span class="flex-1 truncate">${escapeHTML(slide.label || slide.type)}</span>`;
    item.addEventListener('click', () => { goLive(i); });
    item.addEventListener('dblclick', () => selectSlide(i));
    item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(i)));
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      reorderSlide(from, i);
    });
    playlistEl.appendChild(item);
  });
}

function reorderSlide(from, to) {
  if (from === to) return;
  const [moved] = state.slides.splice(from, 1);
  state.slides.splice(to, 0, moved);
  if (state.currentIndex === from) state.currentIndex = to;
  renderPlaylist();
  pushLiveState();
}

function addSlideToPlaylist(slide, { goLiveNow = false } = {}) {
  state.slides.push(slide);
  renderPlaylist();
  selectSlide(state.slides.length - 1);
  pushLiveState('Added to playlist');
  if (goLiveNow) goLive(state.slides.length - 1);
}

function goLive(i) {
  state.currentIndex = i;
  state.blackout = false;
  selectSlide(i);
  renderPlaylist();
  pushLiveState();
}

function navigate(dir) {
  if (state.slides.length === 0) return;
  const next = Math.max(0, Math.min(state.slides.length - 1, state.currentIndex + dir));
  goLive(next);
}

function toggleBlackout() {
  state.blackout = !state.blackout;
  renderPlaylist();
  pushLiveState();
}

document.getElementById('btnNext').addEventListener('click', () => navigate(1));
document.getElementById('btnPrev').addEventListener('click', () => navigate(-1));
document.getElementById('btnBlackout').addEventListener('click', toggleBlackout);
document.getElementById('btnDeleteSlide').addEventListener('click', () => {
  if (state.selectedIndex == null) return;
  state.slides.splice(state.selectedIndex, 1);
  state.selectedIndex = null;
  renderPlaylist();
  paintPreview();
  pushLiveState('Slide deleted');
});

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
  if (e.key === 'b' || e.key === 'B') toggleBlackout();
});

// ---------------------------------------------------------------------------
// Preview canvas + editor
// ---------------------------------------------------------------------------
const previewStage = document.getElementById('previewStage');
let editor;

function currentSlide() {
  return state.selectedIndex != null ? state.slides[state.selectedIndex] : null;
}

function paintPreview() {
  const slide = currentSlide();
  paintSlide(previewStage, slide, { interactive: editor ? editor.interactive : undefined });
  refreshInspectorFromSlide();
}

editor = attachEditor(previewStage, currentSlide, () => { paintPreview(); pushLiveStateDebounced(); }, (elId) => {
  refreshInspectorFromSlide(elId);
});

function selectSlide(i) {
  state.selectedIndex = i;
  renderPlaylist();
  paintPreview();
}

// Debounce Firestore writes while dragging so we don't spam writes every pixel.
let pushTimer = null;
function pushLiveStateDebounced() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushLiveState(), 180);
}

// ---------------------------------------------------------------------------
// Inspector — background
// ---------------------------------------------------------------------------
const bgMode = document.getElementById('bgMode');
const bgColor = document.getElementById('bgColor');
const bgGradFrom = document.getElementById('bgGradFrom');
const bgGradTo = document.getElementById('bgGradTo');
const bgGradAngle = document.getElementById('bgGradAngle');
const bgImageUrl = document.getElementById('bgImageUrl');

function refreshBgRows() {
  document.getElementById('bgColorRow').classList.toggle('hidden', bgMode.value !== 'color');
  document.getElementById('bgGradientRow').classList.toggle('hidden', bgMode.value !== 'gradient');
  document.getElementById('bgImageRow').classList.toggle('hidden', bgMode.value !== 'image');
}

function applyBgFromInspector() {
  const slide = currentSlide();
  if (!slide) return;
  slide.background = {
    mode: bgMode.value,
    color: bgColor.value,
    gradientFrom: bgGradFrom.value,
    gradientTo: bgGradTo.value,
    gradientAngle: parseInt(bgGradAngle.value, 10),
    imageUrl: bgImageUrl.value,
    imageFit: 'cover'
  };
  paintPreview();
  pushLiveStateDebounced();
}
[bgMode, bgColor, bgGradFrom, bgGradTo, bgGradAngle, bgImageUrl].forEach(el => {
  el.addEventListener('input', () => { refreshBgRows(); applyBgFromInspector(); });
});

// ---------------------------------------------------------------------------
// Inspector — selected element
// ---------------------------------------------------------------------------
const elInspector = document.getElementById('elementInspector');
const elContent = document.getElementById('elContent');
const elFont = document.getElementById('elFont');
const elWeight = document.getElementById('elWeight');
const elFontSize = document.getElementById('elFontSize');
const elLetterSpacing = document.getElementById('elLetterSpacing');
const elOpacity = document.getElementById('elOpacity');
const elColor = document.getElementById('elColor');
const elX = document.getElementById('elX'), elY = document.getElementById('elY'), elW = document.getElementById('elW'), elH = document.getElementById('elH');
const elGlow = document.getElementById('elGlow'), elGlowColor = document.getElementById('elGlowColor');
const elOutline = document.getElementById('elOutline'), elOutlineColor = document.getElementById('elOutlineColor');
const elShadow = document.getElementById('elShadow'), elShadowColor = document.getElementById('elShadowColor');

function getSelectedElement() {
  const slide = currentSlide();
  if (!slide || !editor) return null;
  const id = editor.getSelectedId();
  return slide.elements.find(e => e.id === id) || null;
}

function refreshInspectorFromSlide() {
  const slide = currentSlide();
  if (slide) {
    bgMode.value = slide.background.mode;
    bgColor.value = slide.background.color;
    bgGradFrom.value = slide.background.gradientFrom;
    bgGradTo.value = slide.background.gradientTo;
    bgGradAngle.value = slide.background.gradientAngle;
    bgImageUrl.value = slide.background.imageUrl || '';
    refreshBgRows();
    document.getElementById('transitionSelect').value = slide.transition || 'fade';
  }

  const el = getSelectedElement();
  elInspector.classList.toggle('hidden', !el);
  if (!el) return;
  elContent.value = el.content || '';
  elFont.value = el.font;
  elWeight.value = el.weight;
  elFontSize.value = el.fontSize;
  elLetterSpacing.value = el.letterSpacing;
  elOpacity.value = el.opacity;
  elColor.value = el.color;
  elX.value = Math.round(el.x); elY.value = Math.round(el.y); elW.value = Math.round(el.w); elH.value = Math.round(el.h);
  elGlow.value = el.glow; elGlowColor.value = el.glowColor;
  elOutline.value = el.outlineWidth; elOutlineColor.value = el.outlineColor;
  elShadow.value = el.shadowBlur; elShadowColor.value = el.shadowColor;
  document.querySelectorAll('.align-btn').forEach(b => b.classList.toggle('bg-emerald-600', b.dataset.align === el.align));
  document.querySelectorAll('.valign-btn').forEach(b => b.classList.toggle('bg-emerald-600', b.dataset.valign === el.verticalAlign));
}

function applyElFromInspector() {
  const el = getSelectedElement();
  if (!el) return;
  el.content = elContent.value;
  el.font = elFont.value;
  el.weight = elWeight.value;
  el.fontSize = parseFloat(elFontSize.value);
  el.letterSpacing = parseFloat(elLetterSpacing.value);
  el.opacity = parseFloat(elOpacity.value);
  el.color = elColor.value;
  el.x = parseFloat(elX.value); el.y = parseFloat(elY.value); el.w = parseFloat(elW.value); el.h = parseFloat(elH.value);
  el.glow = parseFloat(elGlow.value); el.glowColor = elGlowColor.value;
  el.outlineWidth = parseFloat(elOutline.value); el.outlineColor = elOutlineColor.value;
  el.shadowBlur = parseFloat(elShadow.value); el.shadowColor = elShadowColor.value;
  paintPreview();
  editor.refreshHandles();
  pushLiveStateDebounced();
}
[elContent, elFont, elWeight, elFontSize, elLetterSpacing, elOpacity, elColor, elX, elY, elW, elH, elGlow, elGlowColor, elOutline, elOutlineColor, elShadow, elShadowColor]
  .forEach(el => el.addEventListener('input', applyElFromInspector));

document.querySelectorAll('.align-btn').forEach(b => b.addEventListener('click', () => {
  const el = getSelectedElement(); if (!el) return;
  el.align = b.dataset.align; applyElFromInspector(); refreshInspectorFromSlide();
}));
document.querySelectorAll('.valign-btn').forEach(b => b.addEventListener('click', () => {
  const el = getSelectedElement(); if (!el) return;
  el.verticalAlign = b.dataset.valign; applyElFromInspector(); refreshInspectorFromSlide();
}));

document.getElementById('btnAddTextBox').addEventListener('click', () => {
  const slide = currentSlide(); if (!slide) { toast('Select a slide first', 'error'); return; }
  const el = newElement({ content: 'New text' });
  slide.elements.push(el);
  paintPreview();
  editor.select(el.id);
  refreshInspectorFromSlide();
  pushLiveStateDebounced();
});
document.getElementById('btnDeleteElement').addEventListener('click', () => {
  const slide = currentSlide(); const el = getSelectedElement();
  if (!slide || !el) return;
  slide.elements = slide.elements.filter(e => e.id !== el.id);
  editor.select(null);
  paintPreview();
  pushLiveStateDebounced();
});

document.getElementById('transitionSelect').addEventListener('change', (e) => {
  const slide = currentSlide(); if (!slide) return;
  slide.transition = e.target.value;
  pushLiveStateDebounced();
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.remove('hidden');
  });
});

// ---------------------------------------------------------------------------
// Bible tab
// ---------------------------------------------------------------------------
const bibleTranslation = document.getElementById('bibleTranslation');
const bibleBookSelect = document.getElementById('bibleBookSelect');
const bibleChapterSelect = document.getElementById('bibleChapterSelect');
const bibleResults = document.getElementById('bibleResults');
const bibleSearchInput = document.getElementById('bibleSearchInput');

async function initBible() {
  Bible.listTranslations().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.code; opt.textContent = t.label;
    bibleTranslation.appendChild(opt);
  });
  await loadCurrentTranslation();
}

async function loadCurrentTranslation() {
  const code = bibleTranslation.value;
  await Bible.loadTranslation(code);
  bibleBookSelect.innerHTML = '';
  Bible.getBooks(code).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    bibleBookSelect.appendChild(opt);
  });
  refreshChapters();
}
function refreshChapters() {
  const code = bibleTranslation.value, book = bibleBookSelect.value;
  bibleChapterSelect.innerHTML = '';
  const count = Bible.getChapterCount(code, book);
  for (let c = 1; c <= count; c++) {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = `Chapter ${c}`;
    bibleChapterSelect.appendChild(opt);
  }
}
bibleTranslation.addEventListener('change', loadCurrentTranslation);
bibleBookSelect.addEventListener('change', refreshChapters);

function renderVerseResults(code, verses, book, chapter) {
  bibleResults.innerHTML = '';
  const t = Bible.listTranslations().find(x => x.code === code);
  verses.forEach(v => {
    const card = document.createElement('div');
    card.className = 'border rounded-lg p-2 text-xs bg-slate-50 hover:bg-emerald-50 cursor-pointer';
    card.innerHTML = `<b>${book} ${chapter}:${v.verse}</b> — ${escapeHTML(v.text.slice(0, 90))}${v.text.length > 90 ? '…' : ''}`;
    card.addEventListener('click', () => {
      const reference = Bible.formatReference(book, chapter, v.verse, v.verse);
      const slide = scriptureSlide({ reference, translationAbbr: t.abbr, language: Bible.listTranslations().find(x=>x.code===code) ? (code === 'te' ? 'te' : 'en') : 'en', text: v.text.replace(/\{|\}/g, '') });
      addSlideToPlaylist(slide);
    });
    bibleResults.appendChild(card);
  });
}

document.getElementById('btnBibleGo').addEventListener('click', () => {
  const code = bibleTranslation.value, book = bibleBookSelect.value, chapter = parseInt(bibleChapterSelect.value, 10);
  const verses = Bible.getChapter(code, book, chapter);
  renderVerseResults(code, verses, book, chapter);
});

bibleSearchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const code = bibleTranslation.value;
  const parsed = Bible.parseReference(code, bibleSearchInput.value);
  if (!parsed) { toast('Could not parse reference', 'error'); return; }
  bibleBookSelect.value = parsed.book;
  refreshChapters();
  bibleChapterSelect.value = parsed.chapter;
  if (parsed.whole) {
    renderVerseResults(code, Bible.getChapter(code, parsed.book, parsed.chapter), parsed.book, parsed.chapter);
  } else {
    const verses = Bible.getVerseRange(code, parsed.book, parsed.chapter, parsed.verseStart, parsed.verseEnd);
    renderVerseResults(code, verses, parsed.book, parsed.chapter);
  }
});

// ---------------------------------------------------------------------------
// Songs tab (persisted in Firestore SONGS_COLLECTION)
// ---------------------------------------------------------------------------
const songList = document.getElementById('songList');
const songModal = document.getElementById('songModal');

async function loadSongs() {
  const db = getDb();
  const snap = await getDocs(collection(db, ...SONGS_COLLECTION));
  songsLibrary = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSongList();
}
function renderSongList() {
  songList.innerHTML = '';
  songsLibrary.forEach(song => {
    const row = document.createElement('div');
    row.className = 'border rounded-lg p-2 text-xs bg-slate-50 flex items-center gap-2';
    row.innerHTML = `<span class="flex-1 truncate font-semibold">${escapeHTML(song.title)}</span>
      <button class="btnLoadSong text-emerald-700 font-bold">Add</button>
      <button class="btnDeleteSong text-rose-600 font-bold">✕</button>`;
    row.querySelector('.btnLoadSong').addEventListener('click', () => {
      const lang = 'en';
      const lines = (song.lyrics || '').split('\n').filter(l => l.trim());
      lines.forEach(line => addSlideToPlaylist(lyricsSlide({ songTitle: song.title, artist: song.artist, lineText: line, lang }), {}));
      toast(`${lines.length} slides added from "${song.title}"`, 'success');
    });
    row.querySelector('.btnDeleteSong').addEventListener('click', async () => {
      if (!confirm(`Delete "${song.title}"?`)) return;
      await deleteDoc(doc(getDb(), ...SONGS_COLLECTION, song.id));
      await loadSongs();
      toast('Song deleted', 'success');
    });
    songList.appendChild(row);
  });
}
document.getElementById('btnNewSong').addEventListener('click', () => {
  document.getElementById('songTitleInput').value = '';
  document.getElementById('songArtistInput').value = '';
  document.getElementById('songLyricsInput').value = '';
  songModal.classList.remove('hidden'); songModal.classList.add('flex');
});
document.getElementById('btnCancelSong').addEventListener('click', () => {
  songModal.classList.add('hidden'); songModal.classList.remove('flex');
});
document.getElementById('btnSaveSong').addEventListener('click', async () => {
  const title = document.getElementById('songTitleInput').value.trim();
  if (!title) { toast('Title required', 'error'); return; }
  const song = {
    title,
    artist: document.getElementById('songArtistInput').value.trim(),
    lyrics: document.getElementById('songLyricsInput').value
  };
  await addDoc(collection(getDb(), ...SONGS_COLLECTION), song);
  await loadSongs();
  songModal.classList.add('hidden'); songModal.classList.remove('flex');
  toast('Song saved', 'success');
});

// ---------------------------------------------------------------------------
// Text slide library tab
// ---------------------------------------------------------------------------
document.getElementById('btnAddTextSlide').addEventListener('click', () => {
  const label = document.getElementById('textSlideLabel').value.trim() || 'Text Slide';
  const content = document.getElementById('textSlideContent').value.trim();
  if (!content) { toast('Content required', 'error'); return; }
  addSlideToPlaylist(textSlide({ label, content }));
  document.getElementById('textSlideLabel').value = '';
  document.getElementById('textSlideContent').value = '';
});

// ---------------------------------------------------------------------------
// Images tab (Firebase Storage upload optional; URL always works)
// ---------------------------------------------------------------------------
document.getElementById('btnAddImageSlide').addEventListener('click', async () => {
  const label = document.getElementById('imageLabel').value.trim() || 'Image';
  const file = document.getElementById('imageFile').files[0];
  let url = document.getElementById('imageUrl').value.trim();

  if (file) {
    try {
      const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js');
      const storage = getStorage();
      const path = `freeflow-images/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      url = await getDownloadURL(sRef);
    } catch (e) {
      toast(`Upload failed: ${e.message}. Falling back to URL field.`, 'error');
    }
  }
  if (!url) { toast('Provide an image URL or file', 'error'); return; }
  addSlideToPlaylist(imageSlide({ label, src: url }));
  document.getElementById('imageLabel').value = '';
  document.getElementById('imageUrl').value = '';
  document.getElementById('imageFile').value = '';
});

// ---------------------------------------------------------------------------
// Announcements / Lower thirds tab
// ---------------------------------------------------------------------------
document.getElementById('btnAddAnn').addEventListener('click', () => {
  const title = document.getElementById('annTitle').value.trim();
  const body = document.getElementById('annBody').value.trim();
  if (!title && !body) { toast('Enter a title or body', 'error'); return; }
  addSlideToPlaylist(announcementSlide({ label: title || 'Announcement', title, body }));
  document.getElementById('annTitle').value = ''; document.getElementById('annBody').value = '';
});
document.getElementById('btnAddLowerThird').addEventListener('click', () => {
  const title = document.getElementById('ltTitle').value.trim();
  const subtitle = document.getElementById('ltSubtitle').value.trim();
  if (!title) { toast('Title required', 'error'); return; }
  addSlideToPlaylist(lowerThirdSlide({ label: title, title, subtitle }));
  document.getElementById('ltTitle').value = ''; document.getElementById('ltSubtitle').value = '';
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async function init() {
  await initBible();
  await loadSongs().catch(e => console.warn('loadSongs failed (Firestore rules?)', e));
  renderPlaylist();
})();
