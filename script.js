// ═══════════════════════════════════════
//  SHARED UTILS
// ═══════════════════════════════════════
let scanlineOn = true;

// Saved palettes
const PALETTES_STATE_KEY = 'palette_saved_palettes_v1';
const SCANLINE_STATE_KEY = 'palette_scanline_v1';
const CANVAS_THEME_KEY = 'palette_canvas_theme_v1';
let savedPalettes = [];
let activePaletteId = null;
const debouncedPersistPalettes = debounce(() => {
  persistSavedPalettes();
  refreshSwapperPalettesDropdown();
}, 250);

// Theme presets
const THEME_STATE_KEY = 'palette_theme_state_v1';
const THEMES = {
  default: {
    name: 'Default',
    bg: '#0a0a0a',
    panel: '#111111',
    border: '#222222',
    accent: '#e8ff47',
    accent2: '#ff4747',
    text: '#f0f0f0',
    muted: '#555',
    preview: 'linear-gradient(135deg,#e8ff47,#ff4747)'
  },
  neon: {
    name: 'Neon',
    bg: '#020612',
    panel: '#050919',
    border: '#151a30',
    accent: '#47e8ff',
    accent2: '#ff47d4',
    text: '#e9f5ff',
    muted: '#5a6a8a',
    preview: 'linear-gradient(135deg,#47e8ff,#ff47d4)'
  },
  ocean: {
    name: 'Ocean',
    bg: '#02090d',
    panel: '#06151f',
    border: '#12303f',
    accent: '#36e0b8',
    accent2: '#ffb547',
    text: '#e6fbff',
    muted: '#628a94',
    preview: 'linear-gradient(135deg,#36e0b8,#1b7cff)'
  },
  grape: {
    name: 'Grape',
    bg: '#0b050e',
    panel: '#14091b',
    border: '#2b1538',
    accent: '#ff8bff',
    accent2: '#47a9ff',
    text: '#fdeeff',
    muted: '#7a5a8a',
    preview: 'linear-gradient(135deg,#ff8bff,#47a9ff)'
  },
  auto: {
    name: 'Auto',
    bg: '#0a0a0a',
    panel: '#111111',
    border: '#222222',
    accent: '#e8ff47',
    accent2: '#ff4747',
    text: '#f0f0f0',
    muted: '#555',
    preview: 'linear-gradient(135deg,#888,#444)'
  }
};

function generateAutoTheme(palette) {
  if (!palette || !palette.colors || palette.colors.length === 0) {
    return null;
  }
  
  const colors = palette.colors.map(c => normalizeHex(c)).filter(Boolean);
  if (colors.length === 0) return null;

  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  const getSaturation = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 255) / 255;
    const g = ((rgb >> 8) & 255) / 255;
    const b = (rgb & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
  };

  const sortedByLum = [...colors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const sortedBySat = [...colors].sort((a, b) => getSaturation(b) - getSaturation(a));

  const bg = sortedByLum.find(c => getLuminance(c) < 80) || '#0a0a0a';
  const panel = sortedByLum.find(c => getLuminance(c) >= 40 && getLuminance(c) < 120) || '#111111';
  const border = sortedByLum.find(c => getLuminance(c) >= 80 && getLuminance(c) < 180) || '#222222';
  const text = sortedByLum.find(c => getLuminance(c) > 200) || '#f0f0f0';
  const muted = sortedByLum.find(c => getLuminance(c) >= 120 && getLuminance(c) <= 200) || '#555';
  
  const accent = sortedBySat.find(c => getSaturation(c) > 0.5 && getLuminance(c) > 100) 
    || sortedBySat.find(c => getSaturation(c) > 0.3 && getLuminance(c) > 80)
    || sortedBySat.find(c => getLuminance(c) > 100)
    || colors[0];
  const accent2 = sortedBySat.find(c => {
    const s = getSaturation(c);
    const lum = getLuminance(c);
    return s > 0.3 && lum > 80 && c.toLowerCase() !== accent.toLowerCase();
  }) || sortedBySat.find(c => {
    const lum = getLuminance(c);
    return lum > 80 && c.toLowerCase() !== accent.toLowerCase();
  }) || (colors.length > 1 ? colors[1] : '#ff4747');

  return { bg, panel, border, accent, accent2, text, muted };
}

let currentAutoTheme = null;
let currentThemeName = 'default';

function reapplyCurrentTheme() {
  applyTheme(currentThemeName);
}

function applyTheme(name) {
  currentThemeName = name;
  if (name === 'auto') {
    let p = getActivePalette();
    if (!p && savedPalettes.length > 0) {
      p = savedPalettes[0];
    }
    const autoTheme = p ? generateAutoTheme(p) : null;
    if (autoTheme) {
      currentAutoTheme = autoTheme;
    } else {
      currentAutoTheme = THEMES.default;
    }
    const theme = currentAutoTheme;
    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--panel', theme.panel);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent2', theme.accent2);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--muted', theme.muted);
  } else {
    currentAutoTheme = null;
    const theme = THEMES[name] || THEMES.default;
    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--panel', theme.panel);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent2', theme.accent2);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--muted', theme.muted);
  }

  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
  });

  try {
    localStorage.setItem(THEME_STATE_KEY, JSON.stringify({ theme: name }));
  } catch {}

  updateFavicon();
}

function initThemeCarousel() {
  const container = document.getElementById('themeCarousel');
  if (!container) return;

  const saved = (() => {
    try {
      const raw = localStorage.getItem(THEME_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.theme) return null;
      if (parsed.theme === 'auto') return 'auto';
      return THEMES[parsed.theme] ? parsed.theme : null;
    } catch {
      return null;
    }
  })();

  const initialTheme = saved || 'default';

  Object.entries(THEMES).forEach(([key, t]) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'theme-swatch';
    sw.dataset.theme = key;
    sw.style.background = t.preview;
    sw.title = `Theme: ${t.name}`;
    sw.addEventListener('click', () => applyTheme(key));
    container.appendChild(sw);
  });

  applyTheme(initialTheme);
}

const FAVICON_BASE_COLORS = [
  { r: 0x00, g: 0x00, b: 0x00 },
  { r: 0xac, g: 0x54, b: 0x38 },
  { r: 0xff, g: 0xf0, b: 0xe8 },
  { r: 0xff, g: 0xcc, b: 0xac },
  { r: 0x60, g: 0x58, b: 0x50 },
  { r: 0x1c, g: 0x2c, b: 0x54 },
  { r: 0xc4, g: 0xc4, b: 0xc8 },
  { r: 0x84, g: 0x78, b: 0x9c },
  { r: 0x80, g: 0x24, b: 0x54 },
  { r: 0xff, g: 0x78, b: 0xa8 }
];

function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function mapFaviconColors(baseColors, palette) {
  if (!palette || palette.length === 0) {
    return baseColors;
  }

  return baseColors.map(baseColor => {
    let bestMatch = baseColor;
    let bestDistance = Infinity;

    for (const paletteColor of palette) {
      const dist = colorDistance(baseColor, paletteColor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = paletteColor;
      }
    }

    return bestMatch;
  });
}

function renderFavicon(colors) {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const toHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // Simple geometric design using the 10 colors
  // Background
  ctx.fillStyle = toHex(colors[0].r, colors[0].g, colors[0].b);
  ctx.fillRect(0, 0, size, size);

  // 2x2 color grid pattern (like a palette)
  const gridSize = 12;
  const gap = 2;
  const offsetX = 4;
  const offsetY = 4;

  // Top-left
  ctx.fillStyle = toHex(colors[1].r, colors[1].g, colors[1].b);
  ctx.fillRect(offsetX, offsetY, gridSize, gridSize);

  // Top-right
  ctx.fillStyle = toHex(colors[2].r, colors[2].g, colors[2].b);
  ctx.fillRect(offsetX + gridSize + gap, offsetY, gridSize, gridSize);

  // Bottom-left
  ctx.fillStyle = toHex(colors[3].r, colors[3].g, colors[3].b);
  ctx.fillRect(offsetX, offsetY + gridSize + gap, gridSize, gridSize);

  // Bottom-right
  ctx.fillStyle = toHex(colors[4].r, colors[4].g, colors[4].b);
  ctx.fillRect(offsetX + gridSize + gap, offsetY + gridSize + gap, gridSize, gridSize);

  // Add accent highlights
  ctx.fillStyle = toHex(colors[5].r, colors[5].g, colors[5].b);
  ctx.fillRect(offsetX + 2, offsetY + 2, 3, 3);

  ctx.fillStyle = toHex(colors[6].r, colors[6].g, colors[6].b);
  ctx.fillRect(offsetX + gridSize + gap + 2, offsetY + 2, 3, 3);

  ctx.fillStyle = toHex(colors[7].r, colors[7].g, colors[7].b);
  ctx.fillRect(offsetX + 2, offsetY + gridSize + gap + 2, 3, 3);

  ctx.fillStyle = toHex(colors[8].r, colors[8].g, colors[8].b);
  ctx.fillRect(offsetX + gridSize + gap + 2, offsetY + gridSize + gap + 2, 3, 3);

  // Border accent
  ctx.strokeStyle = toHex(colors[9].r, colors[9].g, colors[9].b);
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return c.toDataURL('image/png');
}

async function updateFavicon() {
  console.log('[Favicon] updateFavicon called');
  let palette = [];

  const activePalette = getActivePalette();
  if (activePalette && activePalette.colors && activePalette.colors.length > 0) {
    palette = activePalette.colors.map(hex => {
      const rgb = hexToRgb(hex);
      return rgb || { r: 255, g: 255, b: 255 };
    });
  } else if (extractedColors && extractedColors.length > 0) {
    palette = extractedColors.map(hex => {
      const rgb = hexToRgb(hex);
      return rgb || { r: 255, g: 255, b: 255 };
    });
  } else {
    const theme = THEMES[currentThemeName] || THEMES.default;
    palette = [
      hexToRgb(theme.accent) || { r: 232, g: 255, b: 71 },
      hexToRgb(theme.accent2) || { r: 255, g: 71, b: 71 },
      hexToRgb(theme.bg) || { r: 10, g: 10, b: 10 },
      hexToRgb(theme.panel) || { r: 17, g: 17, b: 17 },
      hexToRgb(theme.border) || { r: 34, g: 34, b: 34 },
      hexToRgb(theme.text) || { r: 240, g: 240, b: 240 }
    ];
  }

  const mappedColors = mapFaviconColors(FAVICON_BASE_COLORS, palette);

  // Try backend first
  if (serverOnline) {
    try {
      const response = await fetch(SERVER + '/swap-favicon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colors: mappedColors,
          tolerance: 30
        })
      });

      if (response.ok) {
        const data = await response.json();
        const faviconUrl = data.result;

        applyFaviconToDOM(faviconUrl);
        console.log('[Favicon] Updated via backend');
        return;
      }
    } catch (err) {
      console.warn('Backend favicon swap failed, using fallback:', err);
    }
  }

  // Fallback to canvas rendering
  const faviconUrl = renderFavicon(mappedColors);
  applyFaviconToDOM(faviconUrl);
  console.log('[Favicon] Updated via canvas fallback');
}

function applyFaviconToDOM(faviconUrl) {
  // Update browser tab favicon
  let iconLink = document.querySelector('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    document.head.appendChild(iconLink);
  }
  iconLink.type = 'image/png';
  iconLink.href = faviconUrl;

  // Update apple touch icon
  let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouchIcon) {
    appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouchIcon);
  }
  appleTouchIcon.href = faviconUrl;

  // Update header logo
  const headerLogo = document.querySelector('.header-logo');
  if (headerLogo) {
    headerLogo.src = faviconUrl;
  }
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmOverlay');
    const msgEl = document.getElementById('confirmMessage');
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');
    
    msgEl.textContent = message;
    overlay.classList.add('show');
    
    const cleanup = () => {
      overlay.classList.remove('show');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
    };
    
    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };
    
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
  });
}

async function confirm(message) {
  return await showConfirm(message);
}

function showPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('promptOverlay');
    const msgEl = document.getElementById('promptMessage');
    const inputEl = document.getElementById('promptInput');
    const cancelBtn = document.getElementById('promptCancel');
    const okBtn = document.getElementById('promptOk');
    
    msgEl.textContent = message;
    inputEl.value = defaultValue;
    overlay.classList.add('show');
    
    setTimeout(() => inputEl.focus(), 50);
    
    const cleanup = () => {
      overlay.classList.remove('show');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      inputEl.removeEventListener('keydown', onKeydown);
    };
    
    const onCancel = () => { cleanup(); resolve(null); };
    const onOk = () => { cleanup(); resolve(inputEl.value); };
    const onKeydown = (e) => {
      if (e.key === 'Enter') { onOk(); }
      if (e.key === 'Escape') { onCancel(); }
    };
    
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    inputEl.addEventListener('keydown', onKeydown);
  });
}

function prompt(message, defaultValue = '') {
  return showPrompt(message, defaultValue);
}

async function askFilename(defaultValue, message = 'Filename:') {
  const val = await prompt(message, defaultValue);
  if (!val) return null;
  return val.trim();
}

function toggleScanline() {
  scanlineOn = !scanlineOn;
  document.getElementById('scanline').style.opacity = scanlineOn ? '1' : '0';
  document.getElementById('scanlineTrack').classList.toggle('on', scanlineOn);
  try {
    localStorage.setItem(SCANLINE_STATE_KEY, JSON.stringify({ on: scanlineOn }));
  } catch {}
}

function initScanline() {
  try {
    const raw = localStorage.getItem(SCANLINE_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      scanlineOn = parsed.on !== false;
    }
  } catch {
    scanlineOn = true;
  }
  document.getElementById('scanline').style.opacity = scanlineOn ? '1' : '0';
  document.getElementById('scanlineTrack').classList.toggle('on', scanlineOn);
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function normalizeHex(hex) {
  if (!hex) return null;
  let h = String(hex).trim();
  if (!h) return null;
  if (!h.startsWith('#')) h = '#' + h;
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return null;
  return h.toUpperCase();
}

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16)
  };
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function newId(prefix = 'p') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadSavedPalettes() {
  try {
    const raw = localStorage.getItem(PALETTES_STATE_KEY);
    if (!raw) { savedPalettes = []; return; }
    const parsed = JSON.parse(raw);
    savedPalettes = Array.isArray(parsed) ? parsed : [];
  } catch {
    savedPalettes = [];
  }
}

function persistSavedPalettes() {
  try {
    localStorage.setItem(PALETTES_STATE_KEY, JSON.stringify(savedPalettes));
  } catch (err) {
    console.error('persistSavedPalettes failed', err);
  }
}

function cssEscapeSafe(s) {
  try {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
  } catch {}
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
}

function updatePaletteInPlace(id, partial, { updateList = true, persist = true } = {}) {
  const idx = savedPalettes.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const next = { ...savedPalettes[idx], ...partial, updatedAt: Date.now() };
  savedPalettes[idx] = next;
  if (persist) debouncedPersistPalettes();
  if (updateList) {
    const card = document.querySelector(`.palette-card[data-id="${cssEscapeSafe(id)}"]`);
    const nameEl = card?.querySelector('.palette-card-name');
    if (nameEl && typeof partial.name === 'string') nameEl.textContent = partial.name || 'Untitled';
    const metaEl = card?.querySelector('.palette-card-meta');
    if (metaEl && Array.isArray(next.colors)) metaEl.textContent = `${next.colors.length} colors`;
    const strip = card?.querySelector('.palette-card-strip');
    if (strip && Array.isArray(partial.colors)) {
      strip.innerHTML = '';
      const colors = partial.colors.slice(0, 24);
      if (colors.length) {
        colors.forEach(h => {
          const s = document.createElement('span');
          s.style.background = normalizeHex(h) || '#000000';
          strip.appendChild(s);
        });
      } else {
        const s = document.createElement('span');
        s.style.background = 'rgba(255,255,255,0.04)';
        strip.appendChild(s);
      }
    }
  }
  return next;
}

function upsertPalette(palette) {
  palette.updatedAt = Date.now();
  const idx = savedPalettes.findIndex(p => p.id === palette.id);
  if (idx >= 0) savedPalettes[idx] = palette;
  else savedPalettes.unshift(palette);
  persistSavedPalettes();
  renderPalettesTab();
  refreshSwapperPalettesDropdown();
  reapplyCurrentTheme();
}

function deletePaletteById(id) {
  const idx = savedPalettes.findIndex(p => p.id === id);
  if (idx < 0) return;
  savedPalettes.splice(idx, 1);
  if (activePaletteId === id) activePaletteId = null;
  persistSavedPalettes();
  renderPalettesTab();
  refreshSwapperPalettesDropdown();
  reapplyCurrentTheme();
}

function getActivePalette() {
  return savedPalettes.find(p => p.id === activePaletteId) || null;
}

function renderPalettesTab() {
  const list = document.getElementById('palettesList');
  if (!list) return;

  const q = (document.getElementById('palettesSearch')?.value || '').toLowerCase().trim();
  const filtered = savedPalettes.filter(p => {
    if (!q) return true;
    const name = (p.name || '').toLowerCase();
    const colors = Array.isArray(p.colors) ? p.colors.join(' ') : '';
    return name.includes(q) || colors.toLowerCase().includes(q);
  });

  list.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.padding = '30px 0';
    empty.textContent = q ? 'No palettes match your search.' : 'Save palettes from Extractor/Swapper, or create one here.';
    list.appendChild(empty);
  } else {
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'palette-card' + (p.id === activePaletteId ? ' active' : '');
      card.dataset.id = p.id;
      card.onclick = () => { activePaletteId = p.id; renderPalettesTab(); renderPaletteEditor(); reapplyCurrentTheme(); updateFavicon(); };

      const top = document.createElement('div');
      top.className = 'palette-card-top';
      const name = document.createElement('div');
      name.className = 'palette-card-name';
      name.textContent = p.name || 'Untitled';
      const meta = document.createElement('div');
      meta.className = 'palette-card-meta';
      const n = Array.isArray(p.colors) ? p.colors.length : 0;
      meta.textContent = `${n} colors`;
      top.appendChild(name);
      top.appendChild(meta);

      const strip = document.createElement('div');
      strip.className = 'palette-card-strip';
      const colors = (Array.isArray(p.colors) ? p.colors : []).slice(0, 24);
      if (colors.length) {
        colors.forEach(h => {
          const s = document.createElement('span');
          s.style.background = normalizeHex(h) || '#000000';
          strip.appendChild(s);
        });
      } else {
        const s = document.createElement('span');
        s.style.background = 'rgba(255,255,255,0.04)';
        strip.appendChild(s);
      }

      card.appendChild(top);
      card.appendChild(strip);
      list.appendChild(card);
    });
  }

  renderPaletteEditor();
  refreshSwapperPalettesDropdown();
}

function renderPaletteEditor() {
  const editor = document.getElementById('palettesEditor');
  const countEl = document.getElementById('palettesEditorCount');
  if (!editor) return;

  const p = getActivePalette();
  editor.innerHTML = '';

  if (!p) {
    if (countEl) countEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = 'Select a palette to edit, or click <strong>New</strong>.';
    editor.appendChild(empty);
    document.getElementById('palettesDownloadBar').style.display = 'none';
    return;
  }

  const colors = Array.isArray(p.colors) ? p.colors : [];
  if (countEl) countEl.textContent = `${colors.length} colors`;
  
  document.getElementById('palettesDownloadBar').style.display = 'flex';
  updatePalettesExportInfo();

  const row = document.createElement('div');
  row.className = 'palette-editor-row';

  const nameInput = document.createElement('input');
  nameInput.className = 'palette-name-input';
  nameInput.type = 'text';
  nameInput.value = p.name || '';
  nameInput.placeholder = 'palette name';
  nameInput.addEventListener('input', () => {
    const nextName = nameInput.value;
    p.name = nextName;
    updatePaletteInPlace(p.id, { name: nextName }, { updateList: true, persist: true });
  });
  nameInput.addEventListener('blur', () => {
    // Ensure storage has latest name even if user closes quickly.
    debouncedPersistPalettes();
  });

  row.appendChild(nameInput);
  editor.appendChild(row);

  const actions = document.createElement('div');
  actions.className = 'palette-editor-actions';

  const addBtn = document.createElement('button');
  addBtn.className = 'sort-btn';
  addBtn.textContent = 'Add Color';
  addBtn.onclick = () => {
    ColorPicker.open({
      color: '#FFFFFF',
      anchor: addBtn,
      onConfirm: hex => {
        const h = normalizeHex(hex);
        if (!h) return;
        p.colors = [...(Array.isArray(p.colors) ? p.colors : []), h];
        upsertPalette({ ...p });
        showToast('Color added');
      }
    });
  };

  const useBtn = document.createElement('button');
  useBtn.className = 'sort-btn';
  useBtn.textContent = 'Use in Swapper';
  useBtn.onclick = () => {
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const swapTabBtn = tabButtons[1] || tabButtons.find(b => b.textContent.toLowerCase().includes('swapper'));
    if (swapTabBtn) switchTab('swapper', swapTabBtn);
    applyPaletteToSwapper(p.id);
  };

  const dupBtn = document.createElement('button');
  dupBtn.className = 'sort-btn';
  dupBtn.textContent = 'Duplicate';
  dupBtn.onclick = () => {
    const copy = {
      ...p,
      id: newId('p'),
      name: (p.name || 'Untitled') + ' (copy)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    upsertPalette(copy);
    activePaletteId = copy.id;
    renderPalettesTab();
    reapplyCurrentTheme();
    showToast('Palette duplicated');
  };

  const delBtn = document.createElement('button');
  delBtn.className = 'sort-btn';
  delBtn.textContent = 'Delete';
  delBtn.onclick = async () => {
    if (!await confirm(`Delete palette "${p.name || 'Untitled'}"?`)) return;
    deletePaletteById(p.id);
    showToast('Palette deleted');
  };

  actions.appendChild(addBtn);
  actions.appendChild(useBtn);
  actions.appendChild(dupBtn);
  actions.appendChild(delBtn);
  editor.appendChild(actions);

  const grid = document.createElement('div');
  grid.className = 'palette-colors-grid';

  let dragIdx = null;

  colors.forEach((hex, idx) => {
    const item = document.createElement('div');
    item.className = 'palette-color-item';
    item.draggable = true;
    item.dataset.idx = idx;

    const sw = document.createElement('div');
    sw.className = 'palette-color-swatch';
    sw.style.background = normalizeHex(hex) || '#000000';
    sw.title = 'Click to change';
    sw.addEventListener('click', (e) => {
      const normHex = normalizeHex(hex) || '#000000';

      // Power tool: Ctrl+click = copy HEX, Ctrl+Shift+click = copy RGB
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey) {
          const rgb = hexToRgb(normHex);
          if (!rgb) return;
          const text = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
          navigator.clipboard?.writeText(text);
          showToast('Copied ' + text);
        } else {
          navigator.clipboard?.writeText(normHex);
          showToast('Copied ' + normHex);
        }
        return;
      }

      ColorPicker.open({
        color: normHex,
        anchor: sw,
        onConfirm: newHex => {
          const h = normalizeHex(newHex);
          if (!h) return;
          const next = [...colors];
          next[idx] = h;
          p.colors = next;
          upsertPalette({ ...p });
          showToast('Color updated');
        }
      });
    });

    const input = document.createElement('input');
    input.className = 'palette-color-hex';
    input.type = 'text';
    input.value = normalizeHex(hex) || '';
    input.maxLength = 7;
    input.addEventListener('change', () => {
      const h = normalizeHex(input.value);
      if (!h) { input.value = normalizeHex(colors[idx]) || ''; return; }
      const next = [...colors];
      next[idx] = h;
      p.colors = next;
      upsertPalette({ ...p });
    });

    const rm = document.createElement('button');
    rm.className = 'palette-color-remove';
    rm.textContent = '×';
    rm.title = 'Remove color';
    rm.onclick = () => {
      const next = colors.filter((_, i) => i !== idx);
      p.colors = next;
      upsertPalette({ ...p });
    };

    item.addEventListener('dragstart', e => {
      dragIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      item.style.opacity = '0.5';
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
      dragIdx = null;
    });
    item.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    item.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = parseInt(item.dataset.idx, 10);
      if (dragIdx === null || isNaN(targetIdx) || dragIdx === targetIdx) return;
      const next = [...colors];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      p.colors = next;
      upsertPalette({ ...p });
      showToast('Reordered');
    });

    item.appendChild(sw);
    item.appendChild(input);
    item.appendChild(rm);
    grid.appendChild(item);
  });

  editor.appendChild(grid);
}

function createNewPalette() {
  const p = {
    id: newId('p'),
    name: 'New Palette',
    colors: [],
    source: 'custom',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  activePaletteId = p.id;
  upsertPalette(p);
  showToast('Palette created');
}

async function exportPalettesJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    palettes: savedPalettes
  };
  let base = await askFilename('palettes', 'Palettes export filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palettes';
  const filename = base + '.json';
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported ' + filename);
}

function triggerImportPalettesJSON() {
  const input = document.getElementById('palettesImportFile');
  if (!input) return;
  input.value = '';
  input.click();
}

function importPalettesJSON(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = String(reader.result || '');
      const parsed = JSON.parse(raw);
      const palettes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.palettes) ? parsed.palettes : null);
      if (!palettes) throw new Error('Invalid file format');

      const cleaned = palettes
        .map(p => {
          const id = typeof p.id === 'string' && p.id.trim() ? p.id : newId('p');
          const name = typeof p.name === 'string' ? p.name : 'Untitled';
          const colors = Array.isArray(p.colors) ? p.colors.map(normalizeHex).filter(Boolean) : [];
          return {
            id,
            name,
            colors,
            source: p.source || 'import',
            createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
            updatedAt: Date.now()
          };
        })
        .filter(p => p.colors.length || (p.name && p.name.trim()));

      savedPalettes = cleaned;
      persistSavedPalettes();
      renderPalettesTab();
      refreshSwapperPalettesDropdown();
      showToast(`Imported ${cleaned.length} palettes`);
    } catch (err) {
      showToast('Import failed: ' + (err?.message || 'bad JSON'), true);
    }
  };
  reader.readAsText(file);
}

function refreshSwapperPalettesDropdown() {
  const sel = document.getElementById('swapperPalettesSelect');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">-- From Palettes --</option>';
  savedPalettes
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || 'Untitled';
      sel.appendChild(opt);
    });
  sel.value = current;
}

function onSwapperPaletteSelectChanged() {
  // placeholder for future UX (e.g. preview)
}

function applySelectedPaletteToSwapper() {
  const id = document.getElementById('swapperPalettesSelect')?.value;
  if (!id) { showToast('Pick a palette first', true); return; }
  applyPaletteToSwapper(id);
}

function applyPaletteToSwapper(paletteId) {
  if (!swapColorMap || !swapColorMap.length) {
    showToast('Load an image in the Swapper first', true);
    return;
  }
  const p = savedPalettes.find(x => x.id === paletteId);
  const colors = p && Array.isArray(p.colors) ? p.colors.map(normalizeHex).filter(Boolean) : [];
  if (!colors.length) { showToast('Palette is empty', true); return; }

  swapColorMap.forEach((e, i) => {
    const h = colors[i % colors.length];
    const rgb = hexToRgb(h);
    if (rgb) e.replacement = rgb;
  });
  renderSwapList();
  saveHistory();
  invalidateCache();
  if (livePreviewEnabled) renderSwapLivePreview();
  showToast(`Applied palette: ${p.name || 'Untitled'}`);
}

// Debounce and throttle utilities
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const downloadDialog = document.getElementById('downloadDialog');
  const dialogVisible = downloadDialog && downloadDialog.style.display !== 'none';
  if (dialogVisible && e.key === 'Escape') {
    e.preventDefault();
    closeDownloadDialog();
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoSwap(); }
    if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoSwap(); }
    if (e.key === 's') { e.preventDefault(); if (swapImage) downloadSwapResult(); }
    if (e.key === 'Enter') { e.preventDefault(); if (!document.getElementById('applySwapBtn').disabled) applySwap(); }
    if (e.key === '0') { e.preventDefault(); toggleZoom(); }
  }
  if (e.key === 'Escape') { toggleScanline(); }
});

// ═══════════════════════════════════════
//  EXTRACTOR
// ═══════════════════════════════════════
const EXTRACTOR_STATE_KEY = 'palette_extractor_state_v1';
const SWAPPER_STATE_KEY   = 'palette_swapper_state_v1';
const LAYOUT_STATE_KEY    = 'palette_layout_state_v1';

let currentImage = null;
let currentImageDataURL = null;
let extractedColors = [];
let sortMode = 'hue';
let extractionAlgorithm = 'quantize';

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadExtractorImage(f);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadExtractorImage(e.target.files[0]); });

function loadExtractorImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      currentImageDataURL = ev.target.result;
      document.getElementById('imagePreview').src = ev.target.result;
      dropZone.style.display = 'none';
      document.getElementById('imagePreviewWrap').style.display = 'flex';
      document.getElementById('imgMeta').textContent =
        `${img.width} × ${img.height}px · ${(file.size / 1024).toFixed(0)}KB`;
      document.getElementById('extractBtn').disabled = false;
      const linkBtn = document.getElementById('sendToSwapperBtn');
      if (linkBtn) linkBtn.disabled = false;
      saveExtractorState();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function resetExtractor() {
  currentImage = null; currentImageDataURL = null; extractedColors = [];
  dropZone.style.display = 'flex';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('extractBtn').disabled = true;
  document.getElementById('downloadBtn').disabled = true;
  const saveBtn = document.getElementById('saveExtractorToPalettesBtn');
  if (saveBtn) saveBtn.disabled = true;
  const pa = document.getElementById('paletteArea');
  const es = document.getElementById('emptyState');
  pa.innerHTML = '';
  if (es) {
    es.style.display = 'flex';
    pa.appendChild(es);
  }
  document.getElementById('colorCount').textContent = '';
  fileInput.value = '';
  const linkBtn = document.getElementById('sendToSwapperBtn');
  if (linkBtn) linkBtn.disabled = true;
  try { localStorage.removeItem(EXTRACTOR_STATE_KEY); } catch {}
}

function updateMaxColors(v) { document.getElementById('maxColorsVal').textContent = v; }

function setSort(mode, btn) {
  sortMode = mode;
  const container = btn.parentElement;
  container.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (extractedColors.length) renderPalette(extractedColors);
}

function setAlgorithm(algo, btn) {
  extractionAlgorithm = algo;
  const container = btn.parentElement;
  container.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function kMeansClustering(pixels, k, maxIterations = 20) {
  if (pixels.length === 0) return [];
  const centroids = [];
  const used = new Set();
  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) { used.add(idx); centroids.push([...pixels[idx]]); }
  }
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    for (const pixel of pixels) {
      let minDist = Infinity, closestIdx = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d = Math.sqrt((pixel[0] - centroids[i][0]) ** 2 + (pixel[1] - centroids[i][1]) ** 2 + (pixel[2] - centroids[i][2]) ** 2);
        if (d < minDist) { minDist = d; closestIdx = i; }
      }
      clusters[closestIdx].push(pixel);
    }
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const newC = [0, 0, 0];
      for (const p of clusters[i]) { newC[0] += p[0]; newC[1] += p[1]; newC[2] += p[2]; }
      newC[0] = Math.round(newC[0] / clusters[i].length);
      newC[1] = Math.round(newC[1] / clusters[i].length);
      newC[2] = Math.round(newC[2] / clusters[i].length);
      if (newC[0] !== centroids[i][0] || newC[1] !== centroids[i][1] || newC[2] !== centroids[i][2]) converged = false;
      centroids[i] = newC;
    }
    if (converged) break;
  }
  const counts = Array(k).fill(0);
  for (const pixel of pixels) {
    let minDist = Infinity, closestIdx = 0;
    for (let i = 0; i < centroids.length; i++) {
      const d = Math.sqrt((pixel[0] - centroids[i][0]) ** 2 + (pixel[1] - centroids[i][1]) ** 2 + (pixel[2] - centroids[i][2]) ** 2);
      if (d < minDist) { minDist = d; closestIdx = i; }
    }
    counts[closestIdx]++;
  }
  return centroids.map((c, i) => ({ r: c[0], g: c[1], b: c[2], count: counts[i] })).filter(c => c.count > 0);
}

function extractColors() {
  if (!currentImage) return;
  const maxC = parseInt(document.getElementById('maxColors').value);
  canvas.width = currentImage.width;
  canvas.height = currentImage.height;
  ctx.drawImage(currentImage, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sorted;

  if (extractionAlgorithm === 'kmeans') {
    const pixels = [];
    const sampleRate = Math.max(1, Math.floor(data.length / 4 / 50000));
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      if (data[i + 3] >= 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    sorted = kMeansClustering(pixels, maxC);
  } else {
    const colorMap = new Map();
    const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const qr = clamp(Math.round(r / 4) * 4);
      const qg = clamp(Math.round(g / 4) * 4);
      const qb = clamp(Math.round(b / 4) * 4);
      const key = (qr << 16) | (qg << 8) | qb;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxC)
      .map(([key, count]) => ({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff, count }));
  }

  extractedColors = sorted;
  renderPalette(sorted);
  document.getElementById('downloadBtn').disabled = false;
  const saveBtn = document.getElementById('saveExtractorToPalettesBtn');
  if (saveBtn) saveBtn.disabled = !extractedColors.length;
  saveExtractorState();
}

function saveExtractorPaletteToPalettes() {
  if (!extractedColors.length) { showToast('Extract a palette first', true); return; }
  const rawName = document.getElementById('paletteFilename')?.value || 'from_extractor';
  const name = rawName.trim() || 'from_extractor';
  const colors = sortColors(extractedColors).map(c => toHex(c.r, c.g, c.b).toUpperCase());
  const p = {
    id: newId('p'),
    name,
    colors,
    source: 'extractor',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  activePaletteId = p.id;
  upsertPalette(p);
  showToast('Saved to Palettes');
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
  return [h, s, l];
}

function sortColors(colors) {
  const copy = [...colors];
  if (sortMode === 'custom') return copy;
  if (sortMode === 'hue') copy.sort((a, b) => rgbToHsl(a.r, a.g, a.b)[0] - rgbToHsl(b.r, b.g, b.b)[0]);
  else if (sortMode === 'lum') copy.sort((a, b) => rgbToHsl(a.r, a.g, a.b)[2] - rgbToHsl(b.r, b.g, b.b)[2]);
  else if (sortMode === 'sat') copy.sort((a, b) => rgbToHsl(b.r, b.g, b.b)[1] - rgbToHsl(a.r, a.g, a.b)[1]);
  else if (sortMode === 'freq') copy.sort((a, b) => b.count - a.count);
  return copy;
}

let selectedColors = new Set();
let filteredColors = [];
let lastRenderedColors = [];
let isPaletteFiltering = false;
let colorDragSrcIdx = null;

function renderPalette(colors) {
  const sorted = sortColors(colors);
  lastRenderedColors = sorted;
  filteredColors = sorted;
  const filterInput = document.getElementById('colorFilter');
  isPaletteFiltering = !!(filterInput && filterInput.value.trim());
  const pa = document.getElementById('paletteArea');
  pa.innerHTML = '';

  const lb = document.createElement('div'); lb.className = 'loading-bar';
  const lbi = document.createElement('div'); lbi.className = 'loading-bar-inner';
  lb.appendChild(lbi); pa.appendChild(lb);
  setTimeout(() => { lbi.style.width = '100%'; }, 50);

  const strip = document.createElement('div'); strip.className = 'palette-strip';
  sorted.forEach(c => {
    const s = document.createElement('div'); s.className = 'strip-color';
    s.style.background = `rgb(${c.r},${c.g},${c.b})`;
    s.title = toHex(c.r, c.g, c.b);
    strip.appendChild(s);
  });
  pa.appendChild(strip);

  const grid = document.createElement('div'); grid.className = 'color-grid';
  sorted.forEach((c, idx) => {
    const sw = document.createElement('div'); sw.className = 'color-swatch';
    sw.style.background = `rgb(${c.r},${c.g},${c.b})`;
    const hex = toHex(c.r, c.g, c.b); sw.title = hex;
    sw.dataset.idx = idx;
    if (selectedColors.has(idx)) sw.classList.add('selected');
    const lbl = document.createElement('div'); lbl.className = 'swatch-hex'; lbl.textContent = hex;
    sw.appendChild(lbl);
    // Allow dragging colors out to the Palette Swapper (or elsewhere),
    // and reordering within the grid when not filtered.
    sw.draggable = true;
    sw.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', hex);
      sw.classList.add('dragging');
      if (!isPaletteFiltering) {
        colorDragSrcIdx = idx;
      }
    });
    sw.addEventListener('dragend', () => {
      sw.classList.remove('dragging');
      colorDragSrcIdx = null;
    });
    sw.addEventListener('dragover', e => {
      if (isPaletteFiltering || colorDragSrcIdx === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sw.classList.add('drag-over');
    });
    sw.addEventListener('dragleave', () => {
      sw.classList.remove('drag-over');
    });
    sw.addEventListener('drop', e => {
      sw.classList.remove('drag-over');
      if (isPaletteFiltering || colorDragSrcIdx === null) return;
      e.preventDefault();
      const targetIdx = parseInt(sw.dataset.idx, 10);
      if (isNaN(targetIdx) || targetIdx === colorDragSrcIdx) {
        colorDragSrcIdx = null;
        return;
      }
      const arr = [...lastRenderedColors];
      const [item] = arr.splice(colorDragSrcIdx, 1);
      arr.splice(targetIdx, 0, item);
      extractedColors = arr;
      sortMode = 'custom';
      colorDragSrcIdx = null;
      renderPalette(extractedColors);
      saveExtractorState();
    });
    sw.onclick = (e) => {
      if (e.shiftKey) {
        selectedColors.has(idx) ? (selectedColors.delete(idx), sw.classList.remove('selected')) : (selectedColors.add(idx), sw.classList.add('selected'));
      } else {
        showColorDetail(c, idx);
        navigator.clipboard?.writeText(hex);
        showToast('Copied ' + hex);
      }
    };
    grid.appendChild(sw);
  });
  pa.appendChild(grid);
  document.getElementById('colorCount').textContent = `${sorted.length} colors`;
}

function showColorDetail(color, idx) {
  const detail = document.getElementById('colorDetail');
  detail.style.display = 'flex';
  const hex = toHex(color.r, color.g, color.b);
  const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
  document.getElementById('detailSwatch').style.background = hex;
  document.getElementById('detailHex').textContent = hex;
  document.getElementById('detailRgb').textContent = `${color.r}, ${color.g}, ${color.b}`;
  document.getElementById('detailHsl').textContent = `${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  document.getElementById('detailFreq').textContent = color.count;
}

function copyDetail(type) {
  let text = '';
  if (type === 'hex') text = document.getElementById('detailHex').textContent;
  else if (type === 'rgb') text = document.getElementById('detailRgb').textContent;
  else if (type === 'hsl') text = document.getElementById('detailHsl').textContent;
  navigator.clipboard?.writeText(text);
  showToast('Copied ' + text);
}

function filterColors() {
  const query = document.getElementById('colorFilter').value.toLowerCase().trim();
  if (!query) { renderPalette(extractedColors); return; }
  let filtered = [...extractedColors];
  if (query.startsWith('#') && query.length >= 4) {
    const hexMatch = query.replace('#', '');
    filtered = filtered.filter(c => {
      const hex = toHex(c.r, c.g, c.b).toLowerCase().replace('#', '');
      return hex.startsWith(hexMatch) || hex.includes(hexMatch);
    });
  } else if (!isNaN(query) && query.length > 0) {
    const num = parseInt(query);
    if (num >= 0 && num <= 360) {
      filtered = filtered.filter(c => {
        const [h] = rgbToHsl(c.r, c.g, c.b);
        return Math.abs(Math.round(h * 360) - num) <= 15;
      });
    }
  } else {
    filtered = filtered.filter(c => toHex(c.r, c.g, c.b).toLowerCase().includes(query));
  }
  renderPalette(filtered);
}

function selectAllColors() {
  selectedColors.clear();
  filteredColors.forEach((_, idx) => selectedColors.add(idx));
  renderPalette(extractedColors);
  showToast(`Selected ${filteredColors.length} colors`);
}

function clearSelection() {
  selectedColors.clear();
  renderPalette(extractedColors);
}

function updateExportInfo() {
  const format = document.getElementById('extractorExportFormat').value;
  const names = { png: '1px × N palette', json: 'Array of color objects', scss: '$color-name: #hex', tailwind: 'module.exports theme', gpl: 'GIMP palette file' };
  document.getElementById('downloadInfo').textContent = names[format] || '';
}

async function downloadPalette() {
  if (!extractedColors.length) return;
  const format = document.getElementById('extractorExportFormat').value;
  const sorted = sortColors(extractedColors);
  let rawName = document.getElementById('paletteFilename').value.trim() || 'palette';
  rawName = rawName.replace(/\.[a-zA-Z0-9]+$/, '');
  let base = await askFilename(rawName || 'palette', 'Extractor export base filename (no extension):');
  if (!base) return;
  const safeName = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palette';

  if (format === 'png') {
    const n = sorted.length;
    const oc = document.createElement('canvas'); oc.width = n; oc.height = 1;
    const octx = oc.getContext('2d');
    const imgData = octx.createImageData(n, 1);
    sorted.forEach((c, i) => { imgData.data[i * 4] = c.r; imgData.data[i * 4 + 1] = c.g; imgData.data[i * 4 + 2] = c.b; imgData.data[i * 4 + 3] = 255; });
    octx.putImageData(imgData, 0, 0);
    oc.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}_1x${n}.png`; a.click(); URL.revokeObjectURL(url); showToast(`Downloaded ${safeName}_1x${n}.png`); });
  } else if (format === 'json') {
    const data = sorted.map((c, i) => ({ name: `color-${i + 1}`, hex: toHex(c.r, c.g, c.b), rgb: { r: c.r, g: c.g, b: c.b }, hsl: (() => { const [h, s, l] = rgbToHsl(c.r, c.g, c.b); return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }; })(), count: c.count }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.json`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.json`);
  } else if (format === 'scss') {
    let scss = '// Generated palette\n';
    sorted.forEach((c, i) => { scss += `$color-${i + 1}: ${toHex(c.r, c.g, c.b)};\n`; });
    scss += '\n// As map\n$palette: (\n';
    sorted.forEach((c, i) => { scss += `  "color-${i + 1}": ${toHex(c.r, c.g, c.b)},\n`; });
    scss += ');\n';
    const blob = new Blob([scss], { type: 'text/x-scss' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.scss`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.scss`);
  } else if (format === 'tailwind') {
    const colors = {}; sorted.forEach((c, i) => { colors[`${i + 1}00`] = toHex(c.r, c.g, c.b); });
    const config = `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colors, null, 8).replace(/"/g, "'").split('\n').map((l, i) => i === 0 ? l : '      ' + l).join('\n')}\n    }\n  }\n}\n`;
    const blob = new Blob([config], { type: 'text/javascript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tailwind.colors.js'; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded tailwind.colors.js`);
  } else if (format === 'gpl') {
    let gpl = `GIMP Palette\nName: ${safeName}\nColumns: 0\n#\n`;
    sorted.forEach(c => { gpl += `${c.r.toString().padStart(3)} ${c.g.toString().padStart(3)} ${c.b.toString().padStart(3)}\t${toHex(c.r, c.g, c.b)}\n`; });
    const blob = new Blob([gpl], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.gpl`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.gpl`);
  }
}

function updatePalettesExportInfo() {
  const p = getActivePalette();
  const info = document.getElementById('palettesDownloadInfo');
  if (!p || !p.colors || !p.colors.length) {
    if (info) info.textContent = 'No colors';
    return;
  }
  const format = document.getElementById('palettesExportFormat')?.value || 'png';
  const n = p.colors.length;
  if (format === 'png') {
    info.textContent = `1px × ${n} palette`;
  } else if (format === 'json') {
    info.textContent = `${n} colors JSON`;
  } else if (format === 'scss') {
    info.textContent = `${n} colors SCSS`;
  } else if (format === 'tailwind') {
    info.textContent = `${n} colors Tailwind`;
  } else if (format === 'gpl') {
    info.textContent = `${n} colors GIMP`;
  }
}

async function downloadActivePalette() {
  const p = getActivePalette();
  if (!p || !p.colors || !p.colors.length) return;
  
  const format = document.getElementById('palettesExportFormat').value;
  let defaultBase = (p.name || 'palette').replace(/\.[a-zA-Z0-9]+$/, '');
  let base = await askFilename(defaultBase || 'palette', 'Palette export base filename (no extension):');
  if (!base) return;
  const safeName = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palette';
  
  const colors = p.colors.map(c => normalizeHex(c)).filter(Boolean);
  if (colors.length === 0) return;
  
  const parseHex = (hex) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  };
  
  const sorted = colors.map(hex => parseHex(hex));
  
  if (format === 'png') {
    const n = sorted.length;
    const oc = document.createElement('canvas'); oc.width = n; oc.height = 1;
    const octx = oc.getContext('2d');
    const imgData = octx.createImageData(n, 1);
    sorted.forEach((c, i) => { imgData.data[i * 4] = c.r; imgData.data[i * 4 + 1] = c.g; imgData.data[i * 4 + 2] = c.b; imgData.data[i * 4 + 3] = 255; });
    octx.putImageData(imgData, 0, 0);
    oc.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}_1x${n}.png`; a.click(); URL.revokeObjectURL(url); showToast(`Downloaded ${safeName}_1x${n}.png`); });
  } else if (format === 'json') {
    const data = sorted.map((c, i) => ({ name: `color-${i + 1}`, hex: toHex(c.r, c.g, c.b), rgb: { r: c.r, g: c.g, b: c.b }, hsl: (() => { const [h, s, l] = rgbToHsl(c.r, c.g, c.b); return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }; })() }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.json`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.json`);
  } else if (format === 'scss') {
    let scss = '// Generated palette\n';
    sorted.forEach((c, i) => { scss += `$color-${i + 1}: ${toHex(c.r, c.g, c.b)};\n`; });
    scss += '\n// As map\n$palette: (\n';
    sorted.forEach((c, i) => { scss += `  "color-${i + 1}": ${toHex(c.r, c.g, c.b)},\n`; });
    scss += ');\n';
    const blob = new Blob([scss], { type: 'text/x-scss' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.scss`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.scss`);
  } else if (format === 'tailwind') {
    const tailColors = {}; sorted.forEach((c, i) => { tailColors[`${i + 1}00`] = toHex(c.r, c.g, c.b); });
    const config = `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(tailColors, null, 8).replace(/"/g, "'").split('\n').map((l, i) => i === 0 ? l : '      ' + l).join('\n')}\n    }\n  }\n}\n`;
    const blob = new Blob([config], { type: 'text/javascript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tailwind.colors.js'; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded tailwind.colors.js`);
  } else if (format === 'gpl') {
    let gpl = `GIMP Palette\nName: ${safeName}\nColumns: 0\n#\n`;
    sorted.forEach(c => { gpl += `${c.r.toString().padStart(3)} ${c.g.toString().padStart(3)} ${c.b.toString().padStart(3)}\t${toHex(c.r, c.g, c.b)}\n`; });
    const blob = new Blob([gpl], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${safeName}.gpl`; a.click(); URL.revokeObjectURL(url);
    showToast(`Downloaded ${safeName}.gpl`);
  }
}

// Build an ordered HEX palette (for Swapper) from the extractor state.
// If the user has a selection, we use ONLY those colors in the order
// they appear in the last rendered grid. Otherwise we use the full
// extracted palette in its current sort/order.
function buildExtractorPaletteForSwapper() {
  if (!extractedColors || !extractedColors.length) return [];

  // If there is an explicit selection, respect it and the current visual order.
  if (selectedColors && selectedColors.size > 0 && lastRenderedColors && lastRenderedColors.length) {
    const indices = Array.from(selectedColors.values()).sort((a, b) => a - b);
    const picked = indices
      .map(i => lastRenderedColors[i])
      .filter(Boolean);
    return picked.map(c => toHex(c.r, c.g, c.b).toUpperCase());
  }

  // Fallback: use the whole palette in its current sort/order.
  const ordered = sortColors(extractedColors);
  return ordered.map(c => toHex(c.r, c.g, c.b).toUpperCase());
}

// Link current extractor image directly into the Palette Swapper
function sendToSwapper() {
  if (!currentImageDataURL) {
    showToast('Load an image in the Extractor first', true);
    return;
  }

  const paletteHex = buildExtractorPaletteForSwapper();
  if (!paletteHex.length) {
    showToast('Extract a palette first', true);
    return;
  }

  // Switch UI to the Palette Swapper tab
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const swapTabBtn = tabButtons[1] || tabButtons.find(b => b.textContent.toLowerCase().includes('swapper'));
  if (swapTabBtn) {
    switchTab('swapper', swapTabBtn);
  }

  // Use a safe filename based on the extractor palette name
  const nameInput = document.getElementById('paletteFilename');
  const baseName = (nameInput?.value || 'from_extractor').trim() || 'from_extractor';
  swapFilename = 'swapped_' + baseName + '.png';

  // Store state for the palette mode dialog
  const imageDataURL = currentImageDataURL;

  // Create a wrapper function that will be called after user selects mode
  window._pendingSendToSwapperData = {
    imageDataURL,
    paletteHex,
    baseName
  };

  // Show the palette mode dialog
  showPaletteModeDialog(paletteHex);

  saveSwapState();
}

function _completeSendToSwapper(mode) {
  const data = window._pendingSendToSwapperData;
  if (!data) return;

  // Setup UI elements
  swapOrigDataURL = data.imageDataURL;
  swapResultDataURL = null;
  const previewImg = document.getElementById('swapPreviewImg');
  const previewInfo = document.getElementById('swapPreviewInfo');
  const dropContent = document.getElementById('swapDropContent');
  const previewWrap = document.getElementById('swapImagePreview');
  const replaceBtn = document.getElementById('replaceImageBtn');

  if (dropContent) dropContent.style.display = 'none';
  if (previewWrap) previewWrap.style.display = 'flex';
  if (replaceBtn) replaceBtn.style.display = 'block';
  if (previewImg) previewImg.src = data.imageDataURL;
  if (previewInfo) previewInfo.textContent = `${data.baseName} · from Extractor`;

  // Load and process image
  const img = new Image();
  img.onload = () => {
    swapImage = img;
    renderSwapPreview(img);

    // Extract colors from image first
    extractSwapColors(img, {});

    // Then apply palette based on selected mode
    if (mode === 'base') {
      applyIncomingPaletteAsBase(data.paletteHex);
    } else if (mode === 'swapTo') {
      applyIncomingPaletteAsSwapTo(data.paletteHex);
    }

    // Refresh preview
    renderSwapPreview(img);
  };
  img.src = data.imageDataURL;

  window._pendingSendToSwapperData = null;
}

// Persist extractor state (image + palette) so it survives refreshes
function saveExtractorState() {
  try {
    const state = {
      image: currentImageDataURL || null,
      palette: extractedColors || [],
      sortMode,
      maxColors: parseInt(document.getElementById('maxColors').value, 10) || 256,
      paletteFilename: document.getElementById('paletteFilename').value || ''
    };
    localStorage.setItem(EXTRACTOR_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('saveExtractorState failed', err);
  }
}

function restoreExtractorState() {
  let raw = null;
  try {
    raw = localStorage.getItem(EXTRACTOR_STATE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    if (!state || !state.image) return;

    sortMode = state.sortMode || 'hue';

    const img = new Image();
    img.onload = () => {
      currentImage = img;
      currentImageDataURL = state.image;

      dropZone.style.display = 'none';
      const previewWrap = document.getElementById('imagePreviewWrap');
      const previewImg = document.getElementById('imagePreview');
      if (previewWrap) previewWrap.style.display = 'flex';
      if (previewImg) previewImg.src = state.image;

      const meta = document.getElementById('imgMeta');
      if (meta) meta.textContent = `${img.width} × ${img.height}px · restored`;

      document.getElementById('extractBtn').disabled = false;
      const linkBtn = document.getElementById('sendToSwapperBtn');
      if (linkBtn) linkBtn.disabled = false;

      if (typeof state.maxColors === 'number') {
        const slider = document.getElementById('maxColors');
        if (slider) {
          slider.value = state.maxColors;
          updateMaxColors(state.maxColors);
        }
      }

      if (state.paletteFilename) {
        const fn = document.getElementById('paletteFilename');
        if (fn) fn.value = state.paletteFilename;
      }

      if (Array.isArray(state.palette) && state.palette.length) {
        extractedColors = state.palette;
        renderPalette(extractedColors);
        document.getElementById('downloadBtn').disabled = false;
        const saveBtn = document.getElementById('saveExtractorToPalettesBtn');
        if (saveBtn) saveBtn.disabled = false;
      }
    };
    img.src = state.image;
  } catch (err) {
    console.error('restoreExtractorState failed', err);
  }
}

// ═══════════════════════════════════════
//  LAYOUT RESIZER (EXTRACTOR & SWAPPER)
// ═══════════════════════════════════════

function saveLayoutState() {
  try {
    const cs = getComputedStyle(document.body);
    const extractorLeft  = cs.getPropertyValue('--extractor-left').trim()  || '1.05fr';
    const extractorRight = cs.getPropertyValue('--extractor-right').trim() || '0.95fr';
    const swapperLeft    = cs.getPropertyValue('--swapper-left').trim()    || '340px';
    const swapperRight   = cs.getPropertyValue('--swapper-right').trim()   || '1fr';
    const palettesLeft   = cs.getPropertyValue('--palettes-left').trim()   || '360px';
    const palettesRight  = cs.getPropertyValue('--palettes-right').trim()  || '1fr';
    const state = { extractorLeft, extractorRight, swapperLeft, swapperRight, palettesLeft, palettesRight };
    localStorage.setItem(LAYOUT_STATE_KEY, JSON.stringify(state));
  } catch {}
}

function restoreLayoutState() {
  let raw = null;
  try {
    raw = localStorage.getItem(LAYOUT_STATE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    const root = document.body;
    if (state.extractorLeft)  root.style.setProperty('--extractor-left', state.extractorLeft);
    if (state.extractorRight) root.style.setProperty('--extractor-right', state.extractorRight);
    if (state.swapperLeft)    root.style.setProperty('--swapper-left', state.swapperLeft);
    if (state.swapperRight)   root.style.setProperty('--swapper-right', state.swapperRight);
    if (state.palettesLeft)   root.style.setProperty('--palettes-left', state.palettesLeft);
    if (state.palettesRight)  root.style.setProperty('--palettes-right', state.palettesRight);
  } catch {}
}

function initLayoutResizers() {
  const root = document.body;

  // Ensure sensible defaults in case CSS variables are missing
  const cs = getComputedStyle(root);
  if (!cs.getPropertyValue('--extractor-left')) {
    root.style.setProperty('--extractor-left', '1.05fr');
    root.style.setProperty('--extractor-right', '0.95fr');
  }
  if (!cs.getPropertyValue('--swapper-left')) {
    root.style.setProperty('--swapper-left', '340px');
    root.style.setProperty('--swapper-right', '1fr');
  }
  if (!cs.getPropertyValue('--palettes-left')) {
    root.style.setProperty('--palettes-left', '360px');
    root.style.setProperty('--palettes-right', '1fr');
  }

  function setupHorizontalResizer(containerSelector, handleId, leftProp, rightProp, defaultLeft, defaultRight, isLeftFixedPx = false) {
    const container = document.querySelector(containerSelector);
    const handle = document.getElementById(handleId);
    if (!container || !handle) return;

    let dragging = false;

    function onMouseDown(e) {
      if (window.innerWidth <= 860) return;
      e.preventDefault();
      dragging = true;
      document.body.classList.add('resizing');
    }

    function onMouseMove(e) {
      if (!dragging) return;
      const rect = container.getBoundingClientRect();
      let offset = e.clientX - rect.left;
      const min = 220;
      const max = rect.width - 220;
      if (!isFinite(offset)) return;
      offset = Math.max(min, Math.min(max, offset));

      if (isLeftFixedPx) {
        root.style.setProperty(leftProp, `${Math.round(offset)}px`);
        root.style.setProperty(rightProp, '1fr');
      } else {
        const ratio = offset / rect.width || 0.5;
        const leftFr = Math.max(0.3, Math.min(1.7, ratio * 2));
        const rightFr = Math.max(0.3, Math.min(1.7, (1 - ratio) * 2));
        root.style.setProperty(leftProp, `${leftFr.toFixed(2)}fr`);
        root.style.setProperty(rightProp, `${rightFr.toFixed(2)}fr`);
      }
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('resizing');
      saveLayoutState();
    }

    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('dblclick', () => {
      root.style.setProperty(leftProp, defaultLeft);
      root.style.setProperty(rightProp, defaultRight);
      saveLayoutState();
    });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Extractor: two flexible fr columns
  setupHorizontalResizer('.extractor-layout', 'extractorResizer', '--extractor-left', '--extractor-right', '1.05fr', '0.95fr', false);
  // Swapper: sidebar in px, canvas in fr
  setupHorizontalResizer('.swapper-layout', 'swapperResizer', '--swapper-left', '--swapper-right', '340px', '1fr', true);
  // Palettes: list in px, editor in fr
  setupHorizontalResizer('.palettes-layout', 'palettesResizer', '--palettes-left', '--palettes-right', '360px', '1fr', true);
}

// ═══════════════════════════════════════
//  PALETTE SWAPPER
// ═══════════════════════════════════════
const SERVER = 'http://localhost:5050';
let serverOnline = false;
let swapImage = null;
let swapOrigDataURL = null;
let swapColorMap = [];
let swapFilename = 'swapped_result.png';
let swapResultDataURL = null;

// Undo/Redo
let swapHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 50;
let swapExtractionMethod = 'quantize';


function saveHistory() {
  const snapshot = JSON.stringify(swapColorMap.map(e => ({ orig: e.orig, replacement: { ...e.replacement } })));
  swapHistory = swapHistory.slice(0, historyIndex + 1);
  swapHistory.push(snapshot);
  if (swapHistory.length > MAX_HISTORY) swapHistory.shift();
  else historyIndex++;
  saveSwapState();
}

function undoSwap() {
  if (historyIndex > 0) {
    historyIndex--;
    swapColorMap = JSON.parse(swapHistory[historyIndex]);
    renderSwapList();
    if (swapImage) livePreviewEnabled ? renderSwapLivePreview() : renderSwapPreview(swapImage);
    showToast('Undo');
  } else { showToast('Nothing to undo'); }
}

function redoSwap() {
  if (historyIndex < swapHistory.length - 1) {
    historyIndex++;
    swapColorMap = JSON.parse(swapHistory[historyIndex]);
    renderSwapList();
    if (swapImage) livePreviewEnabled ? renderSwapLivePreview() : renderSwapPreview(swapImage);
    showToast('Redo');
  } else { showToast('Nothing to redo'); }
}

async function checkServer() {
  const wasOnline = serverOnline;
  try {
    const r = await fetch(SERVER + '/ping', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      serverOnline = true;
      document.getElementById('serverDot').className = 'status-dot online';
      document.getElementById('serverStatus').textContent = 'server online';
      if (!wasOnline) {
        updateFavicon();
      }
      return true;
    }
  } catch {}
  serverOnline = false;
  document.getElementById('serverDot').className = 'status-dot offline';
  document.getElementById('serverStatus').textContent = 'server offline';
  return false;
}
checkServer();
setInterval(checkServer, 5000);

const swapDropZone = document.getElementById('swapDropZone');
const swapFileInput = document.getElementById('swapFileInput');
swapDropZone.addEventListener('dragover', e => { e.preventDefault(); swapDropZone.classList.add('drag-over'); });
swapDropZone.addEventListener('dragleave', () => swapDropZone.classList.remove('drag-over'));
swapDropZone.addEventListener('drop', e => {
  e.preventDefault(); swapDropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadSwapImage(f);
});
swapFileInput.addEventListener('change', e => { if (e.target.files[0]) loadSwapImage(e.target.files[0]); });

function loadSwapImage(file) {
  swapFilename = 'swapped_' + file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    const info = `${file.name} · ${(file.size / 1024).toFixed(1)}KB`;
    loadSwapImageFromDataURL(ev.target.result, info);
  };
  reader.readAsDataURL(file);
}

function loadSwapImageFromDataURL(dataURL, infoText, options = {}) {
  swapOrigDataURL = dataURL;
  swapResultDataURL = null;
  const previewImg = document.getElementById('swapPreviewImg');
  const previewInfo = document.getElementById('swapPreviewInfo');
  const dropContent = document.getElementById('swapDropContent');
  const previewWrap = document.getElementById('swapImagePreview');
  const replaceBtn = document.getElementById('replaceImageBtn');

  if (dropContent) dropContent.style.display = 'none';
  if (previewWrap) previewWrap.style.display = 'flex';
  if (replaceBtn) replaceBtn.style.display = 'block';
  if (previewImg) previewImg.src = dataURL;
  if (previewInfo && infoText) previewInfo.textContent = infoText;

  const img = new Image();
  img.onload = () => { swapImage = img; renderSwapPreview(img); extractSwapColors(img, options); };
  img.src = dataURL;
}

function resetSwapImage() {
  swapImage = null; swapOrigDataURL = null; swapColorMap = [];
  swapHistory = []; historyIndex = -1;
  document.getElementById('swapDropContent').style.display = 'flex';
  document.getElementById('swapImagePreview').style.display = 'none';
  document.getElementById('replaceImageBtn').style.display = 'none';
  document.getElementById('swapFileInput').value = '';
  document.getElementById('swapCanvasWrap').style.display = 'none';
  document.getElementById('swapEmpty').style.display = 'flex';
  document.getElementById('swapCanvasActions').style.display = 'none';
  document.getElementById('swapColorCount').textContent = '';
  document.getElementById('swapPaletteList').innerHTML = '<div style="color:var(--muted);font-size:0.6rem;text-align:center;padding:20px 0;">Load an image to see its colors</div>';
  document.getElementById('applySwapBtn').disabled = true;
  document.getElementById('resetSwapBtn').disabled = true;
  try { localStorage.removeItem(SWAPPER_STATE_KEY); } catch {}
}

function renderSwapPreview(img) {
  const wrap = document.getElementById('swapCanvasWrap');
  const c = document.getElementById('swapOutputCanvas');
  const maxW = 900, maxH = 600;
  let w = img.width, h = img.height;
  if (!zoomEnabled) {
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
  }
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  document.getElementById('swapEmpty').style.display = 'none';
  wrap.style.display = 'flex';
  document.getElementById('swapCanvasActions').style.display = 'flex';
}

// Global state for palette mode dialog
let pendingIncomingPalette = null;

// Keep old function for backward compatibility but mark as internal
function applyIncomingPaletteToSwapMap(options = {}) {
  const incoming = options.incomingPaletteHex;
  const truncate = !!options.truncateToPalette;

  if (!incoming || !incoming.length || !swapColorMap || !swapColorMap.length) return;

  const hexColors = incoming
    .map(normalizeHex)
    .filter(Boolean);
  if (!hexColors.length) return;

  const limit = truncate ? Math.min(hexColors.length, swapColorMap.length) : swapColorMap.length;
  const nextMap = [];

  for (let i = 0; i < limit; i++) {
    const entry = swapColorMap[i];
    const hex = hexColors[i % hexColors.length];
    const rgb = hexToRgb(hex) || entry.orig;
    nextMap.push({
      orig: entry.orig,
      replacement: { r: rgb.r, g: rgb.g, b: rgb.b }
    });
  }

  if (truncate) {
    swapColorMap = nextMap;
  } else {
    for (let i = 0; i < limit; i++) {
      swapColorMap[i] = nextMap[i];
    }
  }

  const countEl = document.getElementById('swapColorCount');
  if (countEl) countEl.textContent = `${swapColorMap.length} colors`;
}

function applyIncomingPaletteAsBase(paletteHex) {
  if (!paletteHex || !paletteHex.length) {
    showToast('No colors in palette', true);
    return;
  }

  const hexColors = paletteHex
    .map(normalizeHex)
    .filter(Boolean);

  if (!hexColors.length) {
    showToast('Invalid palette colors', true);
    return;
  }

  // Create new swap map with incoming colors as base colors
  swapColorMap = hexColors.map(hex => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return {
      orig: { r: rgb.r, g: rgb.g, b: rgb.b },
      replacement: { r: rgb.r, g: rgb.g, b: rgb.b }
    };
  }).filter(Boolean);

  document.getElementById('swapColorCount').textContent = `${swapColorMap.length} colors`;
  document.getElementById('applySwapBtn').disabled = !swapColorMap.length;
  document.getElementById('resetSwapBtn').disabled = !swapColorMap.length;
  renderSwapList();
  saveHistory();
  showToast(`Applied palette as base colors (${swapColorMap.length} colors)`);
  updateFavicon();
}

function applyIncomingPaletteAsSwapTo(paletteHex) {
  if (!paletteHex || !paletteHex.length || !swapColorMap.length) {
    showToast('No current base colors or palette', true);
    return;
  }

  const hexColors = paletteHex
    .map(normalizeHex)
    .filter(Boolean);

  if (!hexColors.length) {
    showToast('Invalid palette colors', true);
    return;
  }

  // Keep existing base colors, map incoming palette to replacements
  const newLength = hexColors.length;

  // Truncate or extend the map to match incoming palette length
  if (swapColorMap.length > newLength) {
    swapColorMap = swapColorMap.slice(0, newLength);
  } else if (swapColorMap.length < newLength) {
    // Extend by duplicating the last color or wrapping
    const lastColor = swapColorMap[swapColorMap.length - 1].orig;
    while (swapColorMap.length < newLength) {
      swapColorMap.push({
        orig: { ...lastColor },
        replacement: { ...lastColor }
      });
    }
  }

  // Apply incoming palette as replacements
  for (let i = 0; i < swapColorMap.length && i < hexColors.length; i++) {
    const hex = hexColors[i];
    const rgb = hexToRgb(hex);
    if (rgb) {
      swapColorMap[i].replacement = { r: rgb.r, g: rgb.g, b: rgb.b };
    }
  }

  document.getElementById('swapColorCount').textContent = `${swapColorMap.length} colors`;
  renderSwapList();
  saveHistory();
  showToast(`Applied palette as replacement colors (${swapColorMap.length} colors mapped)`);
  updateFavicon();
}

function showPaletteModeDialog(incomingPaletteHex) {
  pendingIncomingPalette = incomingPaletteHex;
  const overlay = document.getElementById('swapModeOverlay');
  overlay.style.display = 'flex';
  overlay.classList.add('show');
}

function applyPaletteMode(mode) {
  const overlay = document.getElementById('swapModeOverlay');
  overlay.style.display = 'none';
  overlay.classList.remove('show');

  if (!pendingIncomingPalette) return;

  if (mode === 'base') {
    applyIncomingPaletteAsBase(pendingIncomingPalette);
  } else if (mode === 'swapTo') {
    applyIncomingPaletteAsSwapTo(pendingIncomingPalette);
  }

  pendingIncomingPalette = null;
}

function closePaletteModeDialog() {
  const overlay = document.getElementById('swapModeOverlay');
  overlay.style.display = 'none';
  overlay.classList.remove('show');
  pendingIncomingPalette = null;
  showToast('Palette application cancelled');
}



async function extractSwapColors(img, options = {}) {
  // Prefer backend extraction when the local server is available.
  if (serverOnline && swapOrigDataURL) {
    try {
      await extractSwapColorsBackend(options);
      return;
    } catch (err) {
      console.error('Backend extract failed, falling back to browser:', err);
      showToast('Backend extract failed — using browser', true);
    }
  }
  extractSwapColorsLocal(img, options);
}

function setSwapExtractionMethod(method, element) {
  swapExtractionMethod = method;
  if (element) {
    element.parentElement.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
  }
  if (swapImage) {
    extractSwapColors(swapImage, { method: swapExtractionMethod });
  }
}

function kmeansQuantize(imageData, maxColors = 128) {
  const data = imageData.data;
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

  // Collect all non-transparent pixels
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    });
  }

  if (pixels.length === 0) return [];
  if (pixels.length <= maxColors) return pixels.slice();

  // Initialize cluster centers by sampling pixels
  const centers = [];
  const step = Math.ceil(pixels.length / maxColors);
  for (let i = 0; i < pixels.length && centers.length < maxColors; i += step) {
    centers.push({ ...pixels[i] });
  }

  // K-means iterations
  const maxIterations = 15;
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = Array(centers.length).fill(null).map(() => []);

    // Assign pixels to nearest center
    for (const pixel of pixels) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < centers.length; j++) {
        const dr = pixel.r - centers[j].r;
        const dg = pixel.g - centers[j].g;
        const db = pixel.b - centers[j].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      clusters[bestIdx].push(pixel);
    }

    // Update centers
    let moved = false;
    for (let j = 0; j < centers.length; j++) {
      if (clusters[j].length === 0) continue;
      const newCenter = {
        r: Math.round(clusters[j].reduce((sum, p) => sum + p.r, 0) / clusters[j].length),
        g: Math.round(clusters[j].reduce((sum, p) => sum + p.g, 0) / clusters[j].length),
        b: Math.round(clusters[j].reduce((sum, p) => sum + p.b, 0) / clusters[j].length)
      };
      if (newCenter.r !== centers[j].r || newCenter.g !== centers[j].g || newCenter.b !== centers[j].b) {
        moved = true;
        centers[j] = newCenter;
      }
    }

    if (!moved) break;
  }

  // Count frequencies and sort
  const colorFreq = new Map();
  for (const pixel of pixels) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let j = 0; j < centers.length; j++) {
      const dr = pixel.r - centers[j].r;
      const dg = pixel.g - centers[j].g;
      const db = pixel.b - centers[j].b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        bestIdx = j;
      }
    }
    const key = (centers[bestIdx].r << 16) | (centers[bestIdx].g << 8) | centers[bestIdx].b;
    colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
  }

  const result = [...colorFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff }));

  return result;
}

function extractSwapColorsLocal(img, options = {}) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx2 = c.getContext('2d');
  ctx2.drawImage(img, 0, 0);
  const imageData = ctx2.getImageData(0, 0, c.width, c.height);

  let sorted;
  const method = options.method || swapExtractionMethod;

  if (method === 'kmeans') {
    sorted = kmeansQuantize(imageData, 128);
  } else {
    const data = imageData.data;
    const colorMap = new Map();
    const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const qr = clamp(Math.round(r / 8) * 8);
      const qg = clamp(Math.round(g / 8) * 8);
      const qb = clamp(Math.round(b / 8) * 8);
      const key = (qr << 16) | (qg << 8) | qb;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 128)
      .map(([key]) => ({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff }));
  }

  swapColorMap = sorted.map(c => ({ orig: c, replacement: { ...c } }));

  applyIncomingPaletteToSwapMap(options);

  document.getElementById('swapColorCount').textContent = `${swapColorMap.length} colors`;
  document.getElementById('applySwapBtn').disabled = !swapColorMap.length;
  document.getElementById('resetSwapBtn').disabled = !swapColorMap.length;
  renderSwapList();
  saveHistory();
}

async function extractSwapColorsBackend(options = {}) {
  const maxColors = 128;
  if (!swapOrigDataURL) return;

  const resp = await fetch(SERVER + '/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: swapOrigDataURL, max_colors: maxColors })
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);

  const data = await resp.json();
  const colors = Array.isArray(data.colors) ? data.colors : [];
  const limited = colors.slice(0, maxColors);

  swapColorMap = limited.map(c => ({
    orig: { r: c.r, g: c.g, b: c.b },
    replacement: { r: c.r, g: c.g, b: c.b }
  }));

  applyIncomingPaletteToSwapMap(options);

  document.getElementById('swapColorCount').textContent = `${swapColorMap.length} colors`;
  const hasColors = swapColorMap.length > 0;
  document.getElementById('applySwapBtn').disabled = !hasColors;
  document.getElementById('resetSwapBtn').disabled = !hasColors;
  renderSwapList();
  saveHistory();
}

async function saveSwapperPaletteToPalettes() {
  if (!swapColorMap.length) { showToast('No colors to save', true); return; }
  const currentPaletteId = document.getElementById('swapperPalettesSelect').value;
  let name;
  let paletteId;
  
  if (currentPaletteId) {
    const existing = savedPalettes.find(p => p.id === currentPaletteId);
    name = existing ? existing.name : '';
    if (!await confirm(`Overwrite palette "${name}"?`)) {
      name = await prompt('Palette name:', (swapFilename || 'from_swapper').replace(/\.[a-zA-Z0-9]+$/, ''));
      if (!name || !name.trim()) return;
      paletteId = newId('p');
    } else {
      paletteId = currentPaletteId;
    }
  } else {
    name = await prompt('Palette name:', (swapFilename || 'from_swapper').replace(/\.[a-zA-Z0-9]+$/, ''));
    if (!name || !name.trim()) return;
    paletteId = newId('p');
  }
  
  const colors = swapColorMap.map(e => toHex(e.replacement.r, e.replacement.g, e.replacement.b).toUpperCase());
  const p = {
    id: paletteId,
    name: name.trim(),
    colors,
    source: 'swapper',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  activePaletteId = p.id;
  upsertPalette(p);
  showToast('Saved to Palettes');
  updateFavicon();
}

// RENDER SWAP LIST - uses custom ColorPicker
function renderSwapList() {
  const list = document.getElementById('swapPaletteList');
  list.innerHTML = '';

  swapColorMap.forEach((entry, idx) => {
    const { orig, replacement } = entry;
    const origHex = toHex(orig.r, orig.g, orig.b);
    const newHex  = toHex(replacement.r, replacement.g, replacement.b);

    const row = document.createElement('div');
    row.className = 'swap-color-row';
    row.draggable = true;
    row.dataset.idx = idx;

    // Original swatch (read-only)
    const so = document.createElement('div');
    so.className = 'swatch-orig';
    so.style.background = origHex;
    so.title = origHex;

    const arr = document.createElement('span');
    arr.className = 'swap-arrow';
    arr.textContent = '→';

    // Replacement swatch - opens CUSTOM picker on click
    const sn = document.createElement('div');
    sn.className = 'swatch-new';
    sn.style.background = newHex;
    sn.title = 'Click to change color';
    sn.dataset.idx = idx;

    sn.addEventListener('click', e => {
      e.stopPropagation();
      ColorPicker.open({
        color: toHex(swapColorMap[idx].replacement.r, swapColorMap[idx].replacement.g, swapColorMap[idx].replacement.b),
        anchor: sn,
        onChange: hex => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          swapColorMap[idx].replacement = { r, g, b };
          sn.style.background = hex;
          hexLabel.value = hex.toUpperCase();
          invalidateCache();
          if (livePreviewEnabled) renderSwapLivePreview();
        },
        onConfirm: hex => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          swapColorMap[idx].replacement = { r, g, b };
          sn.style.background = hex;
          hexLabel.value = hex.toUpperCase();
          saveHistory();
          invalidateCache();
          if (livePreviewEnabled) renderSwapLivePreview();
        },
        onCancel: () => {
          // Restore previous state
          const prev = swapColorMap[idx].replacement;
          sn.style.background = toHex(prev.r, prev.g, prev.b);
          if (livePreviewEnabled) renderSwapLivePreview();
        }
      });
    });

    // Drag-to-copy color
    let colorDragStart = null;
    sn.draggable = true;
    sn.addEventListener('dragstart', e => {
      colorDragStart = idx;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', newHex);
      sn.style.opacity = '0.5';
    });
    sn.addEventListener('dragend', () => { sn.style.opacity = '1'; });
    sn.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    sn.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      const srcHex = e.dataTransfer.getData('text/plain');
      if (srcHex && /^#[0-9a-fA-F]{6}$/.test(srcHex)) {
        const targetIdx = parseInt(sn.dataset.idx);
        if (colorDragStart !== targetIdx) {
          swapColorMap[targetIdx].replacement = { r: parseInt(srcHex.slice(1, 3), 16), g: parseInt(srcHex.slice(3, 5), 16), b: parseInt(srcHex.slice(5, 7), 16) };
          renderSwapList();
          if (livePreviewEnabled) renderSwapLivePreview();
          saveHistory();
        }
      }
    });

    // Original hex label
    const origLabel = document.createElement('span');
    origLabel.className = 'swap-hex-label';
    origLabel.textContent = origHex;

    // Editable new hex label
    const hexLabel = document.createElement('input');
    hexLabel.className = 'swap-hex-new';
    hexLabel.type = 'text';
    hexLabel.value = newHex.toUpperCase();
    hexLabel.maxLength = 7;
    hexLabel.addEventListener('change', () => {
      let hex = hexLabel.value.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { hexLabel.value = toHex(swapColorMap[idx].replacement.r, swapColorMap[idx].replacement.g, swapColorMap[idx].replacement.b).toUpperCase(); return; }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      swapColorMap[idx].replacement = { r, g, b };
      sn.style.background = hex;
      saveHistory();
      invalidateCache();
      if (livePreviewEnabled) renderSwapLivePreview();
    });

    row.appendChild(so);
    row.appendChild(arr);
    row.appendChild(sn);
    row.appendChild(origLabel);
    row.appendChild(hexLabel);
    list.appendChild(row);
  });

  // Row-level drag-to-reorder
  list.querySelectorAll('.swap-color-row').forEach(row => {
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragend', handleDragEnd);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
  });
}

let dragSrcIdx = null;

function handleDragStart(e) { dragSrcIdx = parseInt(e.currentTarget.dataset.idx); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.4'; }
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDragEnter(e) { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }
function handleDragLeave(e) { e.currentTarget.style.borderColor = ''; }
function handleDrop(e) {
  e.preventDefault(); e.currentTarget.style.borderColor = ''; e.currentTarget.style.opacity = '';
  const targetIdx = parseInt((e.currentTarget.closest('.swap-color-row') || e.currentTarget).dataset.idx);
  if (dragSrcIdx !== null && dragSrcIdx !== targetIdx) {
    const item = swapColorMap.splice(dragSrcIdx, 1)[0];
    swapColorMap.splice(targetIdx, 0, item);
    saveHistory(); renderSwapList();
  }
  dragSrcIdx = null;
}
function handleDragEnd(e) { e.currentTarget.style.opacity = ''; }

// ORDER APPLIER FROM 1PX STRIP

function triggerOrderPaletteUpload() {
  const input = document.getElementById('orderPaletteFile');
  if (!input) return;
  if (!swapColorMap || !swapColorMap.length) {
    showToast('Load an image in the Swapper first', true);
    return;
  }
  input.value = '';
  input.click();
}

function applyOrderFromPaletteStrip(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image palette strip', true);
    return;
  }

  if (!swapColorMap || !swapColorMap.length) {
    showToast('Load an image in the Swapper first', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      if (img.height !== 1) {
        showToast('Palette strip image must be exactly 1px tall', true);
        return;
      }

      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = 1;
      const ctx2 = c.getContext('2d');
      ctx2.drawImage(img, 0, 0, img.width, 1);
      const data = ctx2.getImageData(0, 0, c.width, 1).data;

      const stripColors = [];
      for (let x = 0; x < img.width; x++) {
        const idx = x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 1) continue;
        stripColors.push({ r, g, b });
      }

      if (!stripColors.length) {
        showToast('Palette strip appears to be empty', true);
        return;
      }

      // Reorder swapColorMap to follow the left→right order of the strip.
      // We match by closest ORIGINAL color so the strip can be an
      // "original image palette" (1px × N) exported earlier.
      const palette = stripColors;

      const withRank = swapColorMap.map((entry, i) => {
        const o = entry.orig;
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let j = 0; j < palette.length; j++) {
          const p = palette[j];
          const dr = o.r - p.r;
          const dg = o.g - p.g;
          const db = o.b - p.b;
          const d = dr * dr + dg * dg + db * db;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = j;
          }
        }
        return { entry, rank: bestIdx < 0 ? Number.MAX_SAFE_INTEGER : bestIdx, originalIndex: i };
      });

      withRank.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.originalIndex - b.originalIndex;
      });

      swapColorMap = withRank.map(x => x.entry);

      renderSwapList();
      saveHistory();
      if (livePreviewEnabled && swapImage) {
        renderSwapLivePreview();
      }
      showToast('Applied color order from palette strip');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function updateTolerance(v) {
  document.getElementById('swapToleranceVal').textContent = v;
  invalidateCache(); // Invalidate cache when tolerance changes
  if (livePreviewEnabled && swapColorMap.length) renderSwapLivePreview();
}

function buildSwapMappings() {
  return swapColorMap
    .filter(e => toHex(e.orig.r, e.orig.g, e.orig.b) !== toHex(e.replacement.r, e.replacement.g, e.replacement.b))
    .map(e => ({ from: [e.orig.r, e.orig.g, e.orig.b], to: [e.replacement.r, e.replacement.g, e.replacement.b] }));
}

async function applySwap() {
  if (!swapOrigDataURL) return;
  const online = await checkServer();
  if (!online) { showToast('Server offline — run palette_server.py', true); return; }

  const tolerance = parseInt(document.getElementById('swapTolerance').value);
  const outputFormat = document.getElementById('outputFormat').value;
  const mappings = buildSwapMappings();

  if (!mappings.length) { showToast('No colors changed — edit some first'); return; }

  try {
    swapResultDataURL = null;
    const resp = await fetch(SERVER + '/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: swapOrigDataURL, mappings, tolerance, format: outputFormat })
    });
    if (!resp.ok) throw new Error('Server error');
    const data = await resp.json();
    swapResultDataURL = data.result || null;
    const resultFormat = data.format || outputFormat;
    swapFilename = 'swapped_result.' + resultFormat;

    const img = new Image();
    img.onload = () => renderSwapPreview(img);
    img.src = swapResultDataURL || data.result;
    showToast('Colors swapped!');
  } catch (err) { showToast('Swap failed: ' + err.message, true); }
}

function resetSwapColors() {
  if (!swapColorMap.length) return;
  swapColorMap.forEach(e => { e.replacement = { ...e.orig }; });
  renderSwapList();
  if (swapImage) renderSwapPreview(swapImage);
  saveHistory(); showToast('Colors reset');
}

function revertSwap() { if (swapImage) renderSwapPreview(swapImage); }

function openDownloadDialog() {
  const dlg = document.getElementById('downloadDialog');
  if (dlg) {
    dlg.style.display = 'flex';
    dlg.onclick = () => closeDownloadDialog();
  }
}

function closeDownloadDialog() {
  const dlg = document.getElementById('downloadDialog');
  if (dlg) {
    dlg.style.display = 'none';
    dlg.onclick = null;
  }
}

async function renameSwapResult() {
  if (!swapImage) return;
  const ext = swapFilename.split('.').pop() || 'png';
  const baseName = swapFilename.replace(/\.[a-zA-Z0-9]+$/, '');
  const newName = await prompt('Enter filename:', baseName);
  if (!newName || !newName.trim()) return;
  swapFilename = newName.trim() + '.' + ext;
  updateSwapFilenameDisplay();
  saveSwapState();
  showToast('Filename updated');
}

function updateSwapFilenameDisplay() {
  const display = document.getElementById('swapFilenameDisplay');
  if (display) display.textContent = swapFilename;
}

function downloadSwapResult() {
  if (!swapImage) return;
  openDownloadDialog();
}

function downloadResultImageOnly() {
  if (!swapResultDataURL) {
    showToast('Apply a color swap first', true);
    return;
  }

  const a = document.createElement('a');
  a.href = swapResultDataURL;
  a.download = swapFilename;
  a.click();
  showToast('Downloaded ' + swapFilename);

  closeDownloadDialog();
}

async function downloadSwapPalette() {
  if (!swapColorMap.length) return;
  const swatchSize = 80, gap = 4;
  const cols = Math.min(8, swapColorMap.length);
  const rows = Math.ceil(swapColorMap.length / cols);
  let base = await askFilename('palette', 'Palette sheet filename (no extension):');
  if (!base) return;
  const safeName = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palette';
  const oc = document.createElement('canvas');
  oc.width = cols * swatchSize + (cols - 1) * gap;
  oc.height = rows * swatchSize + (rows - 1) * gap;
  const octx = oc.getContext('2d');
  swapColorMap.forEach((e, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * (swatchSize + gap), y = row * (swatchSize + gap);
    octx.fillStyle = toHex(e.replacement.r, e.replacement.g, e.replacement.b);
    octx.fillRect(x, y, swatchSize, swatchSize);
    octx.fillStyle = 'rgba(0,0,0,0.7)';
    octx.fillRect(x, y + swatchSize - 20, swatchSize, 20);
    octx.fillStyle = '#fff'; octx.font = '10px monospace'; octx.textAlign = 'center';
    octx.fillText(toHex(e.replacement.r, e.replacement.g, e.replacement.b), x + swatchSize / 2, y + swatchSize - 6);
  });
  oc.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = safeName + '.png'; a.click(); URL.revokeObjectURL(url); showToast('Downloaded ' + safeName + '.png'); });
}

async function downloadResultPaletteStrip() {
  if (!swapColorMap.length) return;
  const n = swapColorMap.length;
  const oc = document.createElement('canvas');
  oc.width = n;
  oc.height = 1;
  const octx = oc.getContext('2d');
  const imgData = octx.createImageData(n, 1);

  swapColorMap.forEach((e, i) => {
    const idx = i * 4;
    imgData.data[idx]     = e.replacement.r;
    imgData.data[idx + 1] = e.replacement.g;
    imgData.data[idx + 2] = e.replacement.b;
    imgData.data[idx + 3] = 255;
  });

  octx.putImageData(imgData, 0, 0);

  const safeBase = (swapFilename || 'swapped_result').replace(/\.[a-zA-Z0-9]+$/, '');
  let base = await askFilename(`${safeBase}_palette_new_1x${n}`, 'NEW palette strip filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'swapped_result_palette_new_1x' + n;
  const filename = `${base}.png`;

  oc.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }, 'image/png');

  closeDownloadDialog();
}

async function downloadOriginalPaletteStrip() {
  if (!swapColorMap.length) return;
  const n = swapColorMap.length;
  const oc = document.createElement('canvas');
  oc.width = n;
  oc.height = 1;
  const octx = oc.getContext('2d');
  const imgData = octx.createImageData(n, 1);

  swapColorMap.forEach((e, i) => {
    const idx = i * 4;
    imgData.data[idx]     = e.orig.r;
    imgData.data[idx + 1] = e.orig.g;
    imgData.data[idx + 2] = e.orig.b;
    imgData.data[idx + 3] = 255;
  });

  octx.putImageData(imgData, 0, 0);

  const safeBase = (swapFilename || 'swapped_result').replace(/\.[a-zA-Z0-9]+$/, '');
  let base = await askFilename(`${safeBase}_palette_orig_1x${n}`, 'ORIGINAL palette strip filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'swapped_result_palette_orig_1x' + n;
  const filename = `${base}.png`;

  oc.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }, 'image/png');

  closeDownloadDialog();
}

async function downloadResultPalettePack() {
  if (!swapColorMap.length) return;
  const n = swapColorMap.length;
  const oc = document.createElement('canvas');
  oc.width = n;
  oc.height = 2; // row 0 = original, row 1 = replacement
  const octx = oc.getContext('2d');
  const imgData = octx.createImageData(n, 2);

  swapColorMap.forEach((e, i) => {
    const orig = e.orig;
    const rep  = e.replacement;

    // Row 0: original colors
    let idx0 = (0 * n + i) * 4;
    imgData.data[idx0]     = orig.r;
    imgData.data[idx0 + 1] = orig.g;
    imgData.data[idx0 + 2] = orig.b;
    imgData.data[idx0 + 3] = 255;

    // Row 1: replacement colors
    let idx1 = (1 * n + i) * 4;
    imgData.data[idx1]     = rep.r;
    imgData.data[idx1 + 1] = rep.g;
    imgData.data[idx1 + 2] = rep.b;
    imgData.data[idx1 + 3] = 255;
  });

  octx.putImageData(imgData, 0, 0);

  const safeBase = (swapFilename || 'swapped_result').replace(/\.[a-zA-Z0-9]+$/, '');
  let base = await askFilename(`${safeBase}_palette_pack_2x${n}`, 'Palette PACK filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'swapped_result_palette_pack_2x' + n;
  const filename = `${base}.png`;

  oc.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }, 'image/png');

  closeDownloadDialog();
}

async function downloadPaletteSwatchesIndividually() {
  if (!swapColorMap.length) return;
  const swatchSize = 80;
  const defaultPattern = 'color-{index}-{hex}';
  const pattern = await prompt('Swatch filename pattern (use {index} and {hex}):', defaultPattern);
  if (!pattern) return;

  swapColorMap.forEach((e, i) => {
    const hex = toHex(e.replacement.r, e.replacement.g, e.replacement.b);
    const oc = document.createElement('canvas');
    oc.width = swatchSize;
    oc.height = swatchSize;
    const octx = oc.getContext('2d');

    // Background color
    octx.fillStyle = hex;
    octx.fillRect(0, 0, swatchSize, swatchSize);

    // Label strip
    octx.fillStyle = 'rgba(0,0,0,0.7)';
    octx.fillRect(0, swatchSize - 20, swatchSize, 20);
    octx.fillStyle = '#fff';
    octx.font = '10px monospace';
    octx.textAlign = 'center';
    octx.fillText(hex, swatchSize / 2, swatchSize - 6);

    const index = String(i + 1).padStart(2, '0');
    const hexShort = hex.replace('#', '');
    let base = pattern.replace('{index}', index).replace('{hex}', hexShort);
    base = base.trim() || `color-${index}-${hexShort}`;
    base = base.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filename = base.endsWith('.png') ? base : base + '.png';

    oc.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  showToast(`Downloading ${swapColorMap.length} swatches...`);
}

async function downloadPaletteCSS() {
  if (!swapColorMap.length) return;
  let base = await askFilename('palette', 'CSS palette filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palette';
  const filename = base + '.css';
  let css = ':root {\n';
  swapColorMap.forEach((e, i) => { css += `  --color-${i + 1}: ${toHex(e.replacement.r, e.replacement.g, e.replacement.b)};\n`; });
  css += '}\n';
  const blob = new Blob([css], { type: 'text/css' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  showToast('Downloaded ' + filename);
}

async function downloadPaletteASE() {
  if (!swapColorMap.length) return;
  let base = await askFilename('palette', 'ASE palette filename (no extension):');
  if (!base) return;
  base = base.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'palette';
  const filename = base + '.ase';
  const colors = swapColorMap.map(e => ({ name: toHex(e.replacement.r, e.replacement.g, e.replacement.b), r: e.replacement.r / 255, g: e.replacement.g / 255, b: e.replacement.b / 255 }));
  let size = 12;
  colors.forEach(c => { size += 2 + 4 + (c.name.length + 1) * 2 + 4 + 12 + 2; });
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;
  [65, 83, 69, 70].forEach(b => view.setUint8(offset++, b));
  view.setUint16(offset, 1, false); offset += 2;
  view.setUint16(offset, 0, false); offset += 2;
  view.setUint32(offset, colors.length, false); offset += 4;
  colors.forEach(c => {
    view.setUint16(offset, 1, false); offset += 2;
    view.setUint32(offset, 2 + (c.name.length + 1) * 2 + 4 + 12 + 2, false); offset += 4;
    for (let i = 0; i < c.name.length; i++) { view.setUint16(offset, c.name.charCodeAt(i), false); offset += 2; }
    view.setUint16(offset, 0, false); offset += 2;
    [82, 71, 66, 32].forEach(b => view.setUint8(offset++, b));
    view.setFloat32(offset, c.r, false); offset += 4;
    view.setFloat32(offset, c.g, false); offset += 4;
    view.setFloat32(offset, c.b, false); offset += 4;
    view.setUint16(offset, 0, false); offset += 2;
  });
  const blob = new Blob([buffer], { type: 'application/octet-stream' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'palette.ase'; a.click(); URL.revokeObjectURL(url);
  showToast('Downloaded palette.ase');
}

function exportPalette() {
  const format = document.getElementById('exportFormat').value;
  if (format === 'png_sheet') downloadSwapPalette();
  else if (format === 'png_each') downloadPaletteSwatchesIndividually();
  else if (format === 'css') downloadPaletteCSS();
  else if (format === 'ase') downloadPaletteASE();
}

let zoomEnabled = false;
let livePreviewEnabled = true;
const ZOOM_STEPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8];
let zoomLevel = 1;

// Live preview caching and optimization
let cachedPreviewCanvas = null;
let cachedPreviewCtx = null;
let cachedImageData = null;
let lastPreviewHash = '';
let isRendering = false;
let renderQueued = false;

const PREVIEW_MAX_SIZE = 400; // Lower resolution for fast preview
const DEBOUNCE_DELAY = 50; // ms debounce for live updates

// Debounced render functions
const debouncedRenderLivePreview = debounce(() => {
  if (!livePreviewEnabled || !swapImage) return;
  renderSwapLivePreviewInternal();
}, DEBOUNCE_DELAY);

const debouncedRenderLivePreviewServer = debounce(() => {
  if (!livePreviewEnabled || !swapImage || !serverOnline) return;
  renderSwapLivePreviewServer();
}, DEBOUNCE_DELAY);

function toggleLivePreview() {
  livePreviewEnabled = !livePreviewEnabled;
  const btn = document.getElementById('livePreviewBtn');
  if (livePreviewEnabled) { 
    invalidateCache();
    renderSwapLivePreview(); 
    btn.style.opacity = '1'; 
    showToast('Live preview ON'); 
  }
  else { if (swapImage) renderSwapPreview(swapImage); btn.style.opacity = '0.5'; showToast('Live preview OFF'); }
}

function invalidateCache() {
  cachedPreviewCanvas = null;
  cachedImageData = null;
  lastPreviewHash = '';
}

function getCacheKey() {
  const tolerance = document.getElementById('swapTolerance').value;
  const colorsKey = swapColorMap.map(e => 
    `${e.orig.r},${e.orig.g},${e.orig.b}->${e.replacement.r},${e.replacement.g},${e.replacement.b}`
  ).join('|');
  return `${tolerance}:${swapImage.width}x${swapImage.height}:${colorsKey}`;
}

function renderSwapLivePreview() {
  if (!swapImage || !livePreviewEnabled) return;

  // Prefer doing the heavy lifting on the local Python backend when available.
  if (serverOnline && swapOrigDataURL) {
    debouncedRenderLivePreviewServer();
    return;
  }
  
  // Prevent multiple concurrent renders
  if (isRendering) {
    renderQueued = true;
    return;
  }
  
  debouncedRenderLivePreview();
}

async function renderSwapLivePreviewServer() {
  if (!swapOrigDataURL || !swapColorMap.length) return;

  const tolerance = parseInt(document.getElementById('swapTolerance').value);
  const mappings = buildSwapMappings();
  if (!mappings.length) {
    if (swapImage) renderSwapPreview(swapImage);
    return;
  }

  try {
    const resp = await fetch(SERVER + '/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: swapOrigDataURL,
        mappings,
        tolerance,
        format: 'png',
        preview: true,
        preview_max: PREVIEW_MAX_SIZE
      })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const img = new Image();
    img.onload = () => renderSwapPreview(img);
    img.src = data.result;
  } catch (err) {
    console.error('Server preview failed, falling back to browser:', err);
    // Fall back to client-side preview if the backend preview fails.
    if (swapImage) {
      invalidateCache();
      renderSwapLivePreviewInternal();
    }
  }
}

function renderSwapLivePreviewInternal() {
  try {
    isRendering = true;
    
    const c = document.getElementById('swapOutputCanvas');
    if (!c) { isRendering = false; return; }
    
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) { isRendering = false; return; }
    
    // Calculate dimensions with max size for performance
    let w = swapImage.width;
    let h = swapImage.height;
    const maxDim = zoomEnabled ? Math.max(w, h) : PREVIEW_MAX_SIZE;
    
    if (maxDim > PREVIEW_MAX_SIZE) {
      const scale = PREVIEW_MAX_SIZE / maxDim;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    
    // Check cache
    const cacheKey = getCacheKey();
    if (cacheKey === lastPreviewHash && cachedPreviewCanvas && cachedPreviewCanvas.width === w) {
      ctx.putImageData(cachedImageData, 0, 0);
      updateCanvasDisplay();
      isRendering = false;
      return;
    }
    
    // Set canvas size
    c.width = w;
    c.height = h;
    
    // Draw image at lower resolution
    ctx.drawImage(swapImage, 0, 0, w, h);
    
    // Get image data
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const tolerance = parseInt(document.getElementById('swapTolerance').value);
    
    // Pre-calculate color map for faster lookup
    const colorMap = swapColorMap.map(e => ({
      orig: [e.orig.r, e.orig.g, e.orig.b],
      replacement: [e.replacement.r, e.replacement.g, e.replacement.b]
    }));
    
    // Process pixels - optimized with pre-allocated variables
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let bestDist = Infinity;
      let bestRep = null;
      
      // Optimized color matching
      for (const entry of colorMap) {
        const dr = r - entry.orig[0];
        const dg = g - entry.orig[1];
        const db = b - entry.orig[2];
        const d = dr * dr + dg * dg + db * db;
        
        if (d <= tolerance * tolerance && d < bestDist) {
          bestDist = d;
          bestRep = entry.replacement;
        }
      }
      
      if (bestRep) {
        data[i] = bestRep[0];
        data[i + 1] = bestRep[1];
        data[i + 2] = bestRep[2];
      }
    }
    
    // Cache the result
    cachedImageData = imgData;
    lastPreviewHash = cacheKey;
    
    ctx.putImageData(imgData, 0, 0);
    updateCanvasDisplay();
    
  } catch (err) {
    console.error('Live preview error:', err);
    showToast('Preview error - try disabling live preview', true);
  } finally {
    isRendering = false;
    if (renderQueued) {
      renderQueued = false;
      requestAnimationFrame(() => renderSwapLivePreview());
    }
  }
}

function updateCanvasDisplay() {
  document.getElementById('swapEmpty').style.display = 'none';
  document.getElementById('swapCanvasWrap').style.display = 'flex';
  updateSwapFilenameDisplay();
}

function toggleZoom() {
  zoomEnabled = !zoomEnabled;
  const wrap = document.getElementById('swapCanvasWrap');
  const c = document.getElementById('swapOutputCanvas');
  if (zoomEnabled) {
    wrap.classList.add('zoomed'); zoomLevel = 2;
    c.style.transform = `scale(${zoomLevel})`; c.style.transformOrigin = 'center center';
    c.classList.add('zoomed');
    showToast(`Zoom ${zoomLevel}x`);
  } else {
    wrap.classList.remove('zoomed'); zoomLevel = 1;
    c.style.transform = 'scale(1)'; c.classList.remove('zoomed'); c.classList.remove('panning');
    showToast('Zoom disabled');
  }
  if (swapImage) livePreviewEnabled ? renderSwapLivePreview() : renderSwapPreview(swapImage);
}

let canvasTheme = 100;

function setCanvasTheme(value) {
  const wrap = document.getElementById('swapCanvasWrap');
  const icon = document.getElementById('canvasThemeIcon');
  canvasTheme = parseInt(value, 10);
  
  const t = canvasTheme / 100;
  const dark1 = Math.round(17 + (238 - 17) * (1 - t));
  const dark2 = Math.round(10 + (255 - 10) * (1 - t));
  
  wrap.style.background = `repeating-conic-gradient(rgb(${dark1},${dark1},${dark1}) 0% 25%, rgb(${dark2},${dark2},${dark2}) 0% 50%) 50% / 20px 20px`;
  
  if (canvasTheme === 0) {
    icon.textContent = '☀';
  } else if (canvasTheme === 100) {
    icon.textContent = '☾';
  } else {
    icon.textContent = '◐';
  }
  
  try {
    localStorage.setItem(CANVAS_THEME_KEY, JSON.stringify({ theme: canvasTheme }));
  } catch {}
}

function initCanvasTheme() {
  try {
    const raw = localStorage.getItem(CANVAS_THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      canvasTheme = parsed.theme !== undefined ? parsed.theme : 100;
    }
  } catch {
    canvasTheme = 100;
  }
  const wrap = document.getElementById('swapCanvasWrap');
  const slider = document.getElementById('canvasThemeSlider');
  const icon = document.getElementById('canvasThemeIcon');
  
  if (slider) slider.value = canvasTheme;
  
  const t = canvasTheme / 100;
  const dark1 = Math.round(17 + (238 - 17) * (1 - t));
  const dark2 = Math.round(10 + (255 - 10) * (1 - t));
  wrap.style.background = `repeating-conic-gradient(rgb(${dark1},${dark1},${dark1}) 0% 25%, rgb(${dark2},${dark2},${dark2}) 0% 50%) 50% / 20px 20px`;
  
  if (canvasTheme === 0) {
    icon.textContent = '☀';
  } else if (canvasTheme === 100) {
    icon.textContent = '☾';
  } else {
    icon.textContent = '◐';
  }
}

document.getElementById('swapCanvasWrap')?.addEventListener('wheel', e => {
  if (!zoomEnabled || !swapImage) return;
  e.preventDefault();
  const idx = ZOOM_STEPS.indexOf(zoomLevel);
  if (e.deltaY < 0 && idx < ZOOM_STEPS.length - 1) zoomLevel = ZOOM_STEPS[idx + 1];
  else if (e.deltaY > 0 && idx > 0) zoomLevel = ZOOM_STEPS[idx - 1];
  document.getElementById('swapOutputCanvas').style.transform = `scale(${zoomLevel})`;
  showToast(`Zoom ${zoomLevel}x`);
}, { passive: false });

let isPanning = false, panStart = { x: 0, y: 0 }, panScroll = { x: 0, y: 0 };

document.getElementById('swapCanvasWrap')?.addEventListener('mousedown', e => {
  if (!zoomEnabled) return;
  isPanning = true; panStart = { x: e.clientX, y: e.clientY };
  const wrap = document.getElementById('swapCanvasWrap');
  panScroll = { x: wrap.scrollLeft, y: wrap.scrollTop };
  document.getElementById('swapOutputCanvas').classList.add('panning');
});

document.addEventListener('mousemove', e => {
  if (!isPanning) return;
  const wrap = document.getElementById('swapCanvasWrap');
  wrap.scrollLeft = panScroll.x - (e.clientX - panStart.x);
  wrap.scrollTop  = panScroll.y - (e.clientY - panStart.y);
});

document.addEventListener('mouseup', () => {
  isPanning = false;
  document.getElementById('swapOutputCanvas')?.classList.remove('panning');
});

// Presets
function getPresets() { try { return JSON.parse(localStorage.getItem('palettePresets') || '{}'); } catch { return {}; } }
function savePresets(p) { localStorage.setItem('palettePresets', JSON.stringify(p)); refreshPresetDropdown(); }
function refreshPresetDropdown() {
  const select = document.getElementById('presetSelect');
  const current = select.value;
  const presets = getPresets();
  select.innerHTML = '<option value="">-- Presets --</option>';
  Object.keys(presets).forEach(name => {
    const opt = document.createElement('option'); opt.value = name; opt.textContent = name; select.appendChild(opt);
  });
  select.value = current;
}
async function savePreset() {
  if (!swapColorMap.length) { showToast('No colors to save', true); return; }
  const currentPreset = document.getElementById('presetSelect').value;
  let name = currentPreset;
  if (!name) {
    name = await prompt('Preset name:'); if (!name) return;
  } else {
    if (!await confirm(`Overwrite preset "${name}"?`)) {
      name = await prompt('Preset name:'); if (!name) return;
    }
  }
  const p = getPresets(); p[name] = swapColorMap.map(e => ({ orig: e.orig, replacement: e.replacement }));
  savePresets(p);
  document.getElementById('presetSelect').value = name;
  showToast('Preset saved: ' + name);
}
function loadPreset() {
  const name = document.getElementById('presetSelect').value; if (!name) return;
  const p = getPresets();
  if (p[name]) { swapColorMap = p[name].map(e => ({ orig: e.orig, replacement: { ...e.replacement } })); renderSwapList(); saveHistory(); showToast('Preset loaded: ' + name); }
}
async function deletePreset() {
  const name = document.getElementById('presetSelect').value; if (!name) return;
  if (!await confirm('Delete preset "' + name + '"?')) return;
  const p = getPresets(); delete p[name]; savePresets(p); showToast('Preset deleted');
}

// Persist swapper state (image + color map + options) so it survives refreshes
function saveSwapState() {
  try {
    const tolEl = document.getElementById('swapTolerance');
    const outEl = document.getElementById('outputFormat');
    const previewInfo = document.getElementById('swapPreviewInfo');
    const state = {
      image: swapOrigDataURL || null,
      filename: swapFilename || null,
      colorMap: swapColorMap || [],
      tolerance: tolEl ? parseInt(tolEl.value, 10) || 10 : 10,
      outputFormat: outEl ? outEl.value : 'png',
      previewInfo: previewInfo ? previewInfo.textContent : ''
    };
    localStorage.setItem(SWAPPER_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('saveSwapState failed', err);
  }
}

function restoreSwapState() {
  let raw = null;
  try {
    raw = localStorage.getItem(SWAPPER_STATE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    if (!state || !state.image) return;

    swapOrigDataURL = state.image;
    swapFilename = state.filename || 'swapped_result.png';

    const previewImg = document.getElementById('swapPreviewImg');
    const previewInfo = document.getElementById('swapPreviewInfo');
    const dropContent = document.getElementById('swapDropContent');
    const previewWrap = document.getElementById('swapImagePreview');
    const replaceBtn = document.getElementById('replaceImageBtn');

    if (dropContent) dropContent.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'flex';
    if (replaceBtn) replaceBtn.style.display = 'block';
    if (previewImg) previewImg.src = swapOrigDataURL;
    if (previewInfo && state.previewInfo) previewInfo.textContent = state.previewInfo;

    if (typeof state.tolerance === 'number') {
      const tolEl = document.getElementById('swapTolerance');
      const tolVal = document.getElementById('swapToleranceVal');
      if (tolEl) {
        tolEl.value = state.tolerance;
        if (tolVal) tolVal.textContent = String(state.tolerance);
      }
    }

    if (state.outputFormat) {
      const outEl = document.getElementById('outputFormat');
      if (outEl) outEl.value = state.outputFormat;
    }

    if (Array.isArray(state.colorMap) && state.colorMap.length) {
      swapColorMap = state.colorMap.map(e => ({
        orig: e.orig,
        replacement: e.replacement || e.orig
      }));
      const countEl = document.getElementById('swapColorCount');
      if (countEl) countEl.textContent = `${swapColorMap.length} colors`;
      document.getElementById('applySwapBtn').disabled = false;
      document.getElementById('resetSwapBtn').disabled = false;
      renderSwapList();
    }

    const img = new Image();
    img.onload = () => {
      swapImage = img;
      renderSwapPreview(img);
    };
    img.src = swapOrigDataURL;
  } catch (err) {
    console.error('restoreSwapState failed', err);
  }
}

refreshPresetDropdown();
loadSavedPalettes();
renderPalettesTab();
initThemeCarousel();
restoreLayoutState();
initLayoutResizers();
initScanline();
initCanvasTheme();
restoreExtractorState();
restoreSwapState();