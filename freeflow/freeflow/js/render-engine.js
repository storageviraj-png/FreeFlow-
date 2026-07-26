// ============================================================================
// FREEFLOW — render engine. Paints ONE slide object into a stage container.
// Used by BOTH output.html and the controller's preview panel so operators
// see exactly what OBS will show (WYSIWYG), and by the drag/resize editor
// (editor.js) which reuses these same elements as its interactive canvas.
// ============================================================================
import { SCRIPT_FONT_FALLBACK } from './config.js';

const TRANSITION_MS = 380;

export function applyBackground(stageEl, bg) {
  bg = bg || { mode: 'transparent' };
  switch (bg.mode) {
    case 'color':
      stageEl.style.background = bg.color || '#000000';
      break;
    case 'gradient':
      stageEl.style.background = `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.gradientFrom || '#000'}, ${bg.gradientTo || '#333'})`;
      break;
    case 'image':
      stageEl.style.background = bg.imageUrl
        ? `url("${bg.imageUrl}") center/${bg.imageFit || 'cover'} no-repeat`
        : 'transparent';
      break;
    default:
      stageEl.style.background = 'transparent';
  }
}

function styleTextEl(domEl, el) {
  const fallback = SCRIPT_FONT_FALLBACK[el.lang] || 'sans-serif';
  domEl.style.fontFamily = `"${el.font}", ${fallback}`;
  domEl.style.fontWeight = el.weight;
  domEl.style.fontSize = `${el.fontSize}vw`;
  domEl.style.letterSpacing = `${el.letterSpacing}px`;
  domEl.style.color = el.color;
  domEl.style.textAlign = el.align;
  domEl.style.opacity = el.opacity;
  domEl.style.whiteSpace = 'pre-wrap';
  domEl.style.wordBreak = 'break-word';

  const glow = parseFloat(el.glow) > 0 ? `0 0 ${el.glow}px ${el.glowColor}, 0 0 ${el.glow / 2}px ${el.color}` : '';
  const drop = parseFloat(el.shadowBlur) > 0 ? `2px 3px ${el.shadowBlur}px ${el.shadowColor}` : '';
  domEl.style.textShadow = [drop, glow].filter(Boolean).join(', ') || 'none';
  domEl.style.webkitTextStroke = parseFloat(el.outlineWidth) > 0 ? `${el.outlineWidth}px ${el.outlineColor}` : '0px transparent';
}

function positionEl(domEl, el) {
  domEl.style.position = 'absolute';
  domEl.style.left = `${el.x}%`;
  domEl.style.top = `${el.y}%`;
  domEl.style.width = `${el.w}%`;
  domEl.style.height = `${el.h}%`;
  domEl.style.zIndex = el.zIndex ?? 1;
  domEl.style.display = 'flex';
  domEl.style.flexDirection = 'column';
  domEl.style.overflow = 'hidden';
  domEl.style.justifyContent = el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center';
  domEl.style.alignItems = el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center';
}

// Renders `slide` into `stageEl` (a position:relative/fixed container that
// spans the full canvas). Returns nothing; mutates the DOM in place.
// `interactive(elWrapper, elData)` is an optional hook the editor uses to
// attach drag/resize handles — output.html simply omits it.
export function paintSlide(stageEl, slide, { interactive } = {}) {
  stageEl.innerHTML = '';
  if (!slide) { applyBackground(stageEl, null); return; }

  applyBackground(stageEl, slide.background);

  for (const el of slide.elements) {
    const wrap = document.createElement('div');
    wrap.dataset.elId = el.id;
    positionEl(wrap, el);

    if (el.kind === 'image') {
      const img = document.createElement('img');
      img.src = el.src;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = el.imageFit || 'contain';
      img.style.opacity = el.opacity;
      img.draggable = false;
      wrap.appendChild(img);
    } else {
      const p = document.createElement('div');
      p.textContent = el.content;
      styleTextEl(p, el);
      p.style.width = '100%';
      wrap.appendChild(p);
    }

    stageEl.appendChild(wrap);
    if (interactive) interactive(wrap, el);
  }
}

// Transition wrapper: fades/slides/zooms the WHOLE stage out then in when
// swapping to a new slide. `renderFn` should synchronously paint the new
// content (via paintSlide) partway through.
export function transitionTo(stageEl, kind, renderFn) {
  const outClass = `ff-out-${kind || 'fade'}`;
  const inClass = `ff-in-${kind || 'fade'}`;
  stageEl.classList.remove(inClass);
  stageEl.classList.add(outClass);
  setTimeout(() => {
    renderFn();
    stageEl.classList.remove(outClass);
    stageEl.classList.add(inClass);
    requestAnimationFrame(() => stageEl.classList.add('ff-visible'));
  }, kind === 'cut' ? 0 : TRANSITION_MS);
}
