// ============================================================================
// FREEFLOW — Firestore sync layer. Same battle-tested pattern as
// ScriptureFlow/LyricFlow output.html: Firestore onSnapshot is the ONLY sync
// channel (no localStorage/BroadcastChannel — those never cross the OBS CEF
// boundary), anonymous auth, exponential-backoff reconnect, heartbeat
// watchdog, and manual resync on visibility/online/pageshow.
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, doc, onSnapshot, getDoc, setDoc, updateDoc,
  collection, addDoc, deleteDoc, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

export { doc, collection, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, serverTimestamp };

let app, db, auth;
export function initFirebase() {
  if (firebaseConfig.apiKey === 'REPLACE_ME') {
    throw new Error('CONFIG_NOT_SET');
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return { app, db, auth };
}

export function getDb() { return db; }

// Wraps a document path with reconnect/heartbeat/resync logic and calls
// `onData(data|null, meta)` every time fresh state arrives.
export function watchDoc(pathArray, onData, { heartbeatMs = 4000, staleMs = 12000, forceReloadMs = 30000, log = () => {}, onAuthReady = () => {} } = {}) {
  initFirebase();
  const ref = doc(db, ...pathArray);
  let unsubscribe = null;
  let destroyed = false;
  let reconnectAttempt = 0;
  let lastEventAt = 0;

  function attach() {
    if (destroyed) return;
    if (unsubscribe) { try { unsubscribe(); } catch (e) {} }
    log('connecting', { attempt: reconnectAttempt });
    unsubscribe = onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
      lastEventAt = Date.now();
      reconnectAttempt = 0;
      onData(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache });
    }, (error) => {
      log('onSnapshot error', error.code, error.message);
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (destroyed) return;
    reconnectAttempt += 1;
    const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 15000);
    setTimeout(attach, delay);
  }

  async function manualResync(reason) {
    try {
      const snap = await getDoc(ref);
      lastEventAt = Date.now();
      onData(snap.exists() ? snap.data() : null, { fromCache: false, manual: reason });
    } catch (e) { log('manual resync failed', e); }
  }

  setInterval(() => {
    if (lastEventAt === 0) return;
    const silence = Date.now() - lastEventAt;
    if (silence > forceReloadMs) { window.location.reload(); return; }
    if (silence > staleMs) manualResync('heartbeat-stale');
  }, heartbeatMs);

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') manualResync('visibility-restored'); });
  window.addEventListener('online', () => manualResync('network-online'));
  window.addEventListener('pageshow', () => manualResync('pageshow'));
  window.addEventListener('beforeunload', () => { destroyed = true; });

  onAuthStateChanged(auth, (user) => {
    if (user) { onAuthReady(user); manualResync('initial-load').finally(attach); }
  });

  signInAnonymously(auth).catch((e) => log('auth failed', e.code, e.message));

  return { stop: () => { destroyed = true; if (unsubscribe) unsubscribe(); } };
}

export async function readDocOnce(pathArray) {
  initFirebase();
  const ref = doc(db, ...pathArray);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function writeDoc(pathArray, data) {
  initFirebase();
  const ref = doc(db, ...pathArray);
  await setDoc(ref, data, { merge: false });
}

export async function patchDoc(pathArray, data) {
  initFirebase();
  const ref = doc(db, ...pathArray);
  await updateDoc(ref, data).catch(async (e) => {
    // Doc may not exist yet on first write.
    await setDoc(ref, data, { merge: true });
  });
}
