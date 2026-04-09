// AI-Generated Color Picker Component
/* API:
     ColorPicker.open(options) → void
     ColorPicker.close()       → void

   options: {
     color:    '#rrggbb'          // initial color
     anchor:   HTMLElement        // element to position near
     onChange: (hex) => void      // fires on every change
     onConfirm:(hex) => void      // fires on OK / Enter
     onCancel: ()   => void       // fires on Cancel / Escape
   }
*/

const ColorPicker = (() => {

  const MAX_RECENT = 20;
  function getRecent() {
    try { return JSON.parse(localStorage.getItem('cp_recent') || '[]'); }
    catch { return []; }
  }
  function addRecent(hex) {
    let r = getRecent().filter(c => c !== hex);
    r.unshift(hex);
    if (r.length > MAX_RECENT) r = r.slice(0, MAX_RECENT);
    try { localStorage.setItem('cp_recent', JSON.stringify(r)); } catch {}
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h, s, v };
  }

  function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  let state = {
    h: 0, s: 1, v: 1,
    a: 1,
    originalHex: '#ff0000',
    onChangeCb: null,
    onConfirmCb: null,
    onCancelCb: null,
    mode: 'hex',
    draggingSV: false,
    draggingH: false,
  };

  let els = {};
  let picker = null;
  let overlay = null;

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.className = 'cp-overlay';
    overlay.addEventListener('mousedown', onOverlayClick);

    picker = document.createElement('div');
    picker.className = 'cp-picker';
    picker.addEventListener('mousedown', e => e.stopPropagation());

    picker.innerHTML = `
      <div class="cp-header">
        <span class="cp-title">// Color Picker</span>
        <button class="cp-close" id="cp-close-btn">✕</button>
      </div>

      <div class="cp-sv-wrap" id="cp-sv-wrap">
        <canvas class="cp-sv-canvas" id="cp-sv-canvas"></canvas>
        <div class="cp-sv-cursor" id="cp-sv-cursor"></div>
      </div>

      <div class="cp-sliders">
        <div class="cp-slider-row">
          <span class="cp-slider-label">H</span>
          <div class="cp-slider-track-wrap" id="cp-h-track-wrap">
            <canvas class="cp-slider-track" id="cp-h-canvas" height="10"></canvas>
            <div class="cp-slider-thumb" id="cp-h-thumb"></div>
          </div>
        </div>
      </div>

      <div class="cp-mode-tabs">
        <button class="cp-mode-tab active" data-mode="hex">HEX</button>
        <button class="cp-mode-tab" data-mode="rgb">RGB</button>
        <button class="cp-mode-tab" data-mode="hsl">HSL</button>
      </div>

      <div class="cp-bottom">
        <div class="cp-preview-wrap">
          <div class="cp-preview-new" id="cp-preview-new"></div>
          <div class="cp-preview-old" id="cp-preview-old" title="Click to revert to original"></div>
        </div>
        <div class="cp-inputs">
          <div class="cp-hex-row" id="cp-hex-row">
            <span class="cp-input-label">HEX</span>
            <input class="cp-hex-input" id="cp-hex-input" type="text" maxlength="7" spellcheck="false">
          </div>
          <div class="cp-rgb-row" id="cp-rgb-row" style="display:none;">
            <input class="cp-channel-input" id="cp-r-input" type="number" min="0" max="255" placeholder="R">
            <input class="cp-channel-input" id="cp-g-input" type="number" min="0" max="255" placeholder="G">
            <input class="cp-channel-input" id="cp-b-input" type="number" min="0" max="255" placeholder="B">
          </div>
          <div class="cp-rgb-row" id="cp-hsl-row" style="display:none;">
            <input class="cp-channel-input" id="cp-ch-input" type="number" min="0" max="360" placeholder="H°">
            <input class="cp-channel-input" id="cp-cs-input" type="number" min="0" max="100" placeholder="S%">
            <input class="cp-channel-input" id="cp-cl-input" type="number" min="0" max="100" placeholder="L%">
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="cp-eyedropper-btn" id="cp-eyedrop-btn" title="Pick color from screen">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M9 3L3 9l7.5 7.5M15 3l6 6-7.5 7.5M9 3l6 0M3 9l0 6"/><circle cx="18" cy="18" r="3"/>
              </svg>
              Eyedrop
            </button>
          </div>
        </div>
      </div>

      <div class="cp-swatches-section">
        <div class="cp-swatches-label">Recent</div>
        <div class="cp-swatches-grid" id="cp-swatches-grid"></div>
      </div>

      <div class="cp-footer">
        <button class="cp-btn-cancel" id="cp-cancel-btn">Cancel</button>
        <button class="cp-btn-confirm" id="cp-confirm-btn">OK</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(picker);

    els = {
      svWrap:    picker.querySelector('#cp-sv-wrap'),
      svCanvas:  picker.querySelector('#cp-sv-canvas'),
      svCursor:  picker.querySelector('#cp-sv-cursor'),
      hTrack:    picker.querySelector('#cp-h-track-wrap'),
      hCanvas:   picker.querySelector('#cp-h-canvas'),
      hThumb:    picker.querySelector('#cp-h-thumb'),
      previewNew:picker.querySelector('#cp-preview-new'),
      previewOld:picker.querySelector('#cp-preview-old'),
      hexInput:  picker.querySelector('#cp-hex-input'),
      rInput:    picker.querySelector('#cp-r-input'),
      gInput:    picker.querySelector('#cp-g-input'),
      bInput:    picker.querySelector('#cp-b-input'),
      chInput:   picker.querySelector('#cp-ch-input'),
      csInput:   picker.querySelector('#cp-cs-input'),
      clInput:   picker.querySelector('#cp-cl-input'),
      hexRow:    picker.querySelector('#cp-hex-row'),
      rgbRow:    picker.querySelector('#cp-rgb-row'),
      hslRow:    picker.querySelector('#cp-hsl-row'),
      swatches:  picker.querySelector('#cp-swatches-grid'),
      eyedrop:   picker.querySelector('#cp-eyedrop-btn'),
      modeTabs:  picker.querySelectorAll('.cp-mode-tab'),
      closeBtn:  picker.querySelector('#cp-close-btn'),
      confirmBtn:picker.querySelector('#cp-confirm-btn'),
      cancelBtn: picker.querySelector('#cp-cancel-btn'),
    };

    bindEvents();
  }

  function positionPicker(anchor) {
    const margin = 8;
    const pW = 260, pH = 520;

    let x, y;

    if (anchor) {
      const r = anchor.getBoundingClientRect();
      x = r.left;
      y = r.bottom + margin;

      if (x + pW > window.innerWidth - margin) x = r.right - pW;

      if (y + pH > window.innerHeight - margin) {
        y = r.top - pH - margin;
        picker.classList.add('cp-flip-y');
      } else {
        picker.classList.remove('cp-flip-y');
      }
    } else {
      x = (window.innerWidth - pW) / 2;
      y = (window.innerHeight - pH) / 2;
    }

    x = Math.max(margin, Math.min(x, window.innerWidth - pW - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - pH - margin));

    picker.style.left = x + 'px';
    picker.style.top  = y + 'px';
  }

  function drawSV() {
    const canvas = els.svCanvas;
    const wrap = els.svWrap;
    const w = wrap.offsetWidth;
    const h = wrap.offsetHeight;

    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    const hueRgb = hsvToRgb(state.h, 1, 1);
    const hueColor = `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`;

    const gradS = ctx.createLinearGradient(0, 0, w, 0);
    gradS.addColorStop(0, '#fff');
    gradS.addColorStop(1, hueColor);
    ctx.fillStyle = gradS;
    ctx.fillRect(0, 0, w, h);

    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);

    const cx = state.s * w;
    const cy = (1 - state.v) * h;
    els.svCursor.style.left = cx + 'px';
    els.svCursor.style.top  = cy + 'px';

    els.svCursor.style.borderColor = state.v > 0.4 ? '#fff' : '#aaa';
  }

  function drawHue() {
    const canvas = els.hCanvas;
    const w = els.hTrack.offsetWidth;
    canvas.width  = w;
    canvas.height = 10;

    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 12; i++) {
      const rgb = hsvToRgb(i / 12, 1, 1);
      grad.addColorStop(i / 12, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 10);

    els.hThumb.style.left = (state.h * w) + 'px';
  }

  function drawAll() {
    drawSV();
    drawHue();
    updatePreviews();
    updateInputs();
    updateSwatches();
  }

  function currentHex() {
    const { r, g, b } = hsvToRgb(state.h, state.s, state.v);
    return rgbToHex(r, g, b);
  }

  function updatePreviews() {
    const hex = currentHex();
    els.previewNew.style.background = hex;
    els.previewOld.style.background = state.originalHex;
  }

  function updateInputs(skipHex = false) {
    const hex = currentHex();
    const { r, g, b } = hexToRgb(hex);

    if (!skipHex) {
      els.hexInput.value = hex.toUpperCase();
      els.hexInput.classList.remove('invalid');
    }

    els.rInput.value = r;
    els.gInput.value = g;
    els.bInput.value = b;

    const hsl = rgbToHsl(r, g, b);
    els.chInput.value = hsl.h;
    els.csInput.value = hsl.s;
    els.clInput.value = hsl.l;
  }

  function updateSwatches() {
    const hex = currentHex();
    els.swatches.querySelectorAll('.cp-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === hex.toLowerCase());
    });
  }

  function renderSwatchGrid() {
    els.swatches.innerHTML = '';
    const recent = getRecent();
    if (!recent.length) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:0.45rem;color:#333;letter-spacing:0.06em;grid-column:1/-1;padding:4px 0;';
      hint.textContent = 'No recent colors';
      els.swatches.appendChild(hint);
      return;
    }
    recent.forEach(hex => {
      const sw = document.createElement('div');
      sw.className = 'cp-swatch';
      sw.dataset.color = hex.toLowerCase();
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('mousedown', e => {
        e.stopPropagation();
        setFromHex(hex);
        fire();
      });
      els.swatches.appendChild(sw);
    });
  }

  function setFromHex(hex) {
    hex = hex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
    const { r, g, b } = hexToRgb(hex);
    const hsv = rgbToHsv(r, g, b);
    state.h = hsv.h;
    state.s = hsv.s;
    state.v = hsv.v;
    drawAll();
    return true;
  }

  function setFromRgb(r, g, b) {
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    const hsv = rgbToHsv(r, g, b);
    state.h = hsv.h;
    state.s = hsv.s;
    state.v = hsv.v;
    drawAll();
  }

  function fire() {
    const hex = currentHex();
    if (state.onChangeCb) state.onChangeCb(hex);
  }

  function bindEvents() {
    els.svWrap.addEventListener('mousedown', e => {
      state.draggingSV = true;
      updateSVFromEvent(e);
      e.preventDefault();
    });

    els.hTrack.addEventListener('mousedown', e => {
      state.draggingH = true;
      updateHFromEvent(e);
      e.preventDefault();
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    els.svWrap.addEventListener('touchstart', e => {
      state.draggingSV = true;
      updateSVFromEvent(e.touches[0]);
      e.preventDefault();
    }, { passive: false });

    els.hTrack.addEventListener('touchstart', e => {
      state.draggingH = true;
      updateHFromEvent(e.touches[0]);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (state.draggingSV || state.draggingH) {
        onMouseMove(e.touches[0]);
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', onMouseUp);

    els.hexInput.addEventListener('input', () => {
      let v = els.hexInput.value.trim();
      els.hexInput.classList.toggle('invalid', v.length > 1 && !/^#?[0-9a-fA-F]{0,6}$/.test(v));
    });

    els.hexInput.addEventListener('blur', () => {
      const ok = setFromHex(els.hexInput.value);
      if (!ok) { els.hexInput.value = currentHex().toUpperCase(); els.hexInput.classList.remove('invalid'); }
      else fire();
    });

    els.hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { els.hexInput.blur(); }
    });

    [els.rInput, els.gInput, els.bInput].forEach(inp => {
      inp.addEventListener('change', () => {
        setFromRgb(+els.rInput.value, +els.gInput.value, +els.bInput.value);
        fire();
      });
    });

    [els.chInput, els.csInput, els.clInput].forEach(inp => {
      inp.addEventListener('change', () => {
        const h = Math.max(0, Math.min(360, +els.chInput.value)) / 360;
        const s = Math.max(0, Math.min(100, +els.csInput.value)) / 100;
        const l = Math.max(0, Math.min(100, +els.clInput.value)) / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        const hi = Math.floor(h * 6) % 6;
        const comps = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][hi];
        r = Math.round((comps[0] + m) * 255);
        g = Math.round((comps[1] + m) * 255);
        b = Math.round((comps[2] + m) * 255);
        setFromRgb(r, g, b);
        fire();
      });
    });

    els.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        state.mode = tab.dataset.mode;
        els.modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === state.mode));
        els.hexRow.style.display = state.mode === 'hex' ? 'flex' : 'none';
        els.rgbRow.style.display = state.mode === 'rgb' ? 'flex' : 'none';
        els.hslRow.style.display = state.mode === 'hsl' ? 'flex' : 'none';
      });
    });

    // Old color preview (revert)
    els.previewOld.addEventListener('click', () => {
      setFromHex(state.originalHex);
      fire();
    });

    // Eyedropper
    els.eyedrop.addEventListener('click', async () => {
      if (!window.EyeDropper) {
        els.eyedrop.textContent = 'Not supported';
        return;
      }
      try {
        const ed = new EyeDropper();
        const result = await ed.open();
        setFromHex(result.sRGBHex);
        fire();
      } catch (err) { /* User cancelled */ }
    });
    if (!window.EyeDropper) els.eyedrop.disabled = true;

    // Keyboard nav on whole picker
    picker.addEventListener('keydown', e => {
      if (e.key === 'Escape') { cancel(); }
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') { confirm(); }

      // Arrow keys on SV
      if (e.target === els.svWrap) {
        const step = e.shiftKey ? 0.05 : 0.01;
        if (e.key === 'ArrowLeft')  { state.s = Math.max(0, state.s - step); drawAll(); fire(); e.preventDefault(); }
        if (e.key === 'ArrowRight') { state.s = Math.min(1, state.s + step); drawAll(); fire(); e.preventDefault(); }
        if (e.key === 'ArrowUp')    { state.v = Math.min(1, state.v + step); drawAll(); fire(); e.preventDefault(); }
        if (e.key === 'ArrowDown')  { state.v = Math.max(0, state.v - step); drawAll(); fire(); e.preventDefault(); }
      }
    });

    // Buttons
    els.closeBtn.addEventListener('click', cancel);
    els.cancelBtn.addEventListener('click', cancel);
    els.confirmBtn.addEventListener('click', confirm);
  }

  function onMouseMove(e) {
    if (state.draggingSV) { updateSVFromEvent(e); }
    if (state.draggingH)  { updateHFromEvent(e); }
  }

  function onMouseUp() {
    if (state.draggingSV || state.draggingH) {
      state.draggingSV = false;
      state.draggingH = false;
    }
  }

  function updateSVFromEvent(e) {
    const rect = els.svWrap.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    state.s = x;
    state.v = 1 - y;
    drawAll();
    fire();
  }

  function updateHFromEvent(e) {
    const rect = els.hTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    state.h = x;
    drawSV();
    drawHue();
    updatePreviews();
    updateInputs();
    fire();
  }

  function onOverlayClick() {
    cancel();
  }

  function confirm() {
    const hex = currentHex();
    addRecent(hex);
    if (state.onConfirmCb) state.onConfirmCb(hex);
    close();
  }

  function cancel() {
    if (state.onCancelCb) state.onCancelCb();
    close();
  }

  function close() {
    if (picker) picker.remove();
    if (overlay) overlay.remove();
    picker = null;
    overlay = null;
    els = {};
    state.draggingSV = false;
    state.draggingH = false;
    // Remove global listeners to avoid leaks
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function open(opts = {}) {
    // Close existing picker if open
    if (picker) close();

    const initialHex = opts.color || '#ff0000';
    const { r, g, b } = hexToRgb(initialHex);
    const hsv = rgbToHsv(r, g, b);

    state.h = hsv.h;
    state.s = hsv.s;
    state.v = hsv.v;
    state.originalHex = initialHex;
    state.onChangeCb  = opts.onChange  || null;
    state.onConfirmCb = opts.onConfirm || null;
    state.onCancelCb  = opts.onCancel  || null;
    state.mode = 'hex';

    buildDOM();
    positionPicker(opts.anchor || null);
    renderSwatchGrid();

    // Defer drawAll so canvas has layout dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawAll();
      });
    });
  }

  return { open, close };
})();