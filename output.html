// ============================================================================
// FREEFLOW — canvas editor. Attaches drag-to-move and drag-to-resize handles
// to each element rendered on the interactive preview stage. All math is
// done in percentages of the stage's own bounding box, so it matches
// render-engine.js's percentage-based positioning exactly.
// ============================================================================

const HANDLE_POS = [
  ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0],
  ['w', 0, 0.5], ['e', 1, 0.5],
  ['sw', 0, 1], ['s', 0.5, 1], ['se', 1, 1]
];

const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

// attachEditor(stageEl, getSlide, onChange, onSelect)
// - getSlide(): returns the current slide object being edited
// - onChange(): called after any element x/y/w/h mutation (caller re-renders + persists)
// - onSelect(elId | null): called when selection changes
export function attachEditor(stageEl, getSlide, onChange, onSelect) {
  let selectedId = null;

  function clearHandles() {
    stageEl.querySelectorAll('.ff-handle').forEach(h => h.remove());
    stageEl.querySelectorAll('.ff-editable').forEach(w => w.classList.remove('ff-selected'));
  }

  function select(id) {
    selectedId = id;
    onSelect(id);
    renderHandles();
  }

  function renderHandles() {
    clearHandles();
    if (!selectedId) return;
    const wrap = stageEl.querySelector(`[data-el-id="${selectedId}"]`);
    if (!wrap) return;
    wrap.classList.add('ff-selected');
    for (const [name, fx, fy] of HANDLE_POS) {
      const h = document.createElement('div');
      h.className = 'ff-handle';
      h.dataset.handle = name;
      h.style.left = `calc(${wrap.style.left} + ${wrap.style.width} * ${fx} - 5px)`;
      h.style.top = `calc(${wrap.style.top} + ${wrap.style.height} * ${fy} - 5px)`;
      h.style.cursor = CURSORS[name];
      h.addEventListener('mousedown', (e) => startResize(e, name));
      stageEl.appendChild(h);
    }
  }

  function stageRect() { return stageEl.getBoundingClientRect(); }

  function startDrag(e, elData, wrap) {
    e.preventDefault();
    select(elData.id);
    const rect = stageRect();
    const startX = e.clientX, startY = e.clientY;
    const origX = elData.x, origY = elData.y;

    function onMove(ev) {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      elData.x = Math.max(0, Math.min(100 - elData.w, origX + dxPct));
      elData.y = Math.max(0, Math.min(100 - elData.h, origY + dyPct));
      onChange();
      renderHandles();
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startResize(e, handleName) {
    e.preventDefault();
    e.stopPropagation();
    const slide = getSlide();
    const elData = slide.elements.find(el => el.id === selectedId);
    if (!elData) return;
    const rect = stageRect();
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: elData.x, y: elData.y, w: elData.w, h: elData.h };

    function onMove(ev) {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let { x, y, w, h } = orig;

      if (handleName.includes('e')) w = Math.max(4, orig.w + dxPct);
      if (handleName.includes('s')) h = Math.max(4, orig.h + dyPct);
      if (handleName.includes('w')) { w = Math.max(4, orig.w - dxPct); x = orig.x + dxPct; }
      if (handleName.includes('n')) { h = Math.max(4, orig.h - dyPct); y = orig.y + dyPct; }

      elData.x = Math.max(0, x);
      elData.y = Math.max(0, y);
      elData.w = Math.min(100 - elData.x, w);
      elData.h = Math.min(100 - elData.y, h);
      onChange();
      renderHandles();
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Called by render-engine's paintSlide(...,{interactive}) for every element wrapper.
  function interactive(wrap, elData) {
    wrap.classList.add('ff-editable');
    wrap.style.pointerEvents = 'auto';
    wrap.addEventListener('mousedown', (e) => startDrag(e, elData, wrap));
    if (elData.id === selectedId) wrap.classList.add('ff-selected');
  }

  stageEl.addEventListener('mousedown', (e) => {
    if (e.target === stageEl) select(null);
  });

  return { interactive, select, getSelectedId: () => selectedId, refreshHandles: renderHandles };
}
