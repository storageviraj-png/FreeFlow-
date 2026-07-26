// ============================================================================
// FREEFLOW — shared config. Loaded by both controller.html and output.html.
// EDIT THIS FILE with your own Firebase project values, then keep it in sync
// across both pages (they both <script src="js/config.js"> this same file,
// so you only edit it once).
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCwYTT99Gkm2DXsNayu5PQKGoMqbVQk1oM",
  authDomain: "freeflow-d52a1.firebaseapp.com",
  databaseURL: "https://freeflow-d52a1-default-rtdb.firebaseio.com",
  projectId: "freeflow-d52a1",
  storageBucket: "freeflow-d52a1.firebasestorage.app",
  messagingSenderId: "319346371419",
  appId: "1:319346371419:web:8aa953d2471e00249a887e"
};

// Bump this only if you want to reset every operator to a fresh, empty state.
export const APP_ID = "freeflow-live";

// Single live-state document — this is what output.html listens to.
export const LIVE_STATE_PATH = ['artifacts', APP_ID, 'public', 'data', 'freeflow_state', 'current'];

// Collections (library content, persisted independently of what's live)
export const SONGS_COLLECTION   = ['artifacts', APP_ID, 'public', 'data', 'songs'];
export const SLIDES_COLLECTION  = ['artifacts', APP_ID, 'public', 'data', 'text_slides'];
export const IMAGES_COLLECTION  = ['artifacts', APP_ID, 'public', 'data', 'images'];
export const PLAYLISTS_COLLECTION = ['artifacts', APP_ID, 'public', 'data', 'playlists'];

export const SCRIPT_FONT_FALLBACK = {
  en: 'sans-serif',
  te: '"Noto Sans Telugu", sans-serif',
  hi: '"Noto Sans Devanagari", sans-serif'
};
