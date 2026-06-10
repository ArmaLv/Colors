// COLOR PICKER FOR EXTRACTOR TAB
let colorPickerMode = false;
let pickedColor = null;

function toggleColorPicker(btn) {
  if (!currentImage) {
    showToast('Load an image first', true);
    return;
  }

  colorPickerMode = !colorPickerMode;
  btn.classList.toggle('active', colorPickerMode);

  const imagePreview = document.getElementById('imagePreview');
  const canvasEl = document.getElementById('canvas');

  if (colorPickerMode) {
    // Enable color picker mode
    imagePreview.classList.add('picker-mode');
    canvasEl.classList.add('canvas-picker-mode');
    imagePreview.addEventListener('click', handleImageClick);
    canvasEl.addEventListener('click', handleCanvasClick);
    showToast('Color Picker Active - Click on image to pick colors');
  } else {
    // Disable color picker mode
    imagePreview.classList.remove('picker-mode');
    canvasEl.classList.remove('canvas-picker-mode');
    imagePreview.removeEventListener('click', handleImageClick);
    canvasEl.removeEventListener('click', handleCanvasClick);
    showToast('Color Picker Disabled');
  }
}

function handleImageClick(e) {
  if (!colorPickerMode || !currentImage) return;
  
  const rect = e.target.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (currentImage.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (currentImage.height / rect.height));
  
  extractPixelColor(x, y);
}

function handleCanvasClick(e) {
  if (!colorPickerMode || !canvas.width) return;
  
  const rect = e.target.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
  
  extractPixelColor(x, y);
}

function extractPixelColor(x, y) {
  if (!canvas.width || !canvas.height) return;
  
  const imgData = ctx.getImageData(x, y, 1, 1);
  const data = imgData.data;
  
  pickedColor = {
    r: data[0],
    g: data[1],
    b: data[2],
    a: data[3]
  };
  
  // Show modal with picked color
  showColorPickerModal();
}

function showColorPickerModal() {
  if (!pickedColor) return;
  
  const hex = toHex(pickedColor.r, pickedColor.g, pickedColor.b);
  const modal = document.getElementById('colorPickerModal');
  const swatch = document.getElementById('pickerSwatch');
  const hexLabel = document.getElementById('pickerHex');
  
  swatch.style.background = hex;
  hexLabel.textContent = hex;
  
  modal.classList.add('show');
}

function closeColorPickerModal() {
  const modal = document.getElementById('colorPickerModal');
  const replaceList = document.getElementById('replaceColorList');
  
  modal.classList.remove('show');
  replaceList.style.display = 'none';
  pickedColor = null;
}

function addPickedColor() {
  if (!pickedColor) return;
  
  const newColor = {
    id: nextColorId++,
    r: pickedColor.r,
    g: pickedColor.g,
    b: pickedColor.b,
    count: 1
  };
  
  extractedColors.push(newColor);
  renderPalette(extractedColors);
  saveExtractorState();
  closeColorPickerModal();
  showToast('Color added to palette');
}

function showReplaceColorSelect() {
  const replaceList = document.getElementById('replaceColorList');
  const replaceGrid = document.getElementById('replaceColorGrid');
  
  replaceGrid.innerHTML = '';
  extractedColors.forEach((color, idx) => {
    const item = document.createElement('div');
    item.className = 'replace-color-item';
    item.style.background = `rgb(${color.r},${color.g},${color.b})`;
    
    const label = document.createElement('div');
    label.className = 'color-label';
    label.textContent = (color.id || idx + 1);
    item.appendChild(label);
    
    item.addEventListener('click', () => {
      replaceColorInPalette(idx);
    });
    
    replaceGrid.appendChild(item);
  });
  
  replaceList.style.display = 'block';
}

function replaceColorInPalette(idx) {
  if (!pickedColor || idx < 0 || idx >= extractedColors.length) return;
  
  const oldColor = extractedColors[idx];
  oldColor.r = pickedColor.r;
  oldColor.g = pickedColor.g;
  oldColor.b = pickedColor.b;
  
  renderPalette(extractedColors);
  saveExtractorState();
  closeColorPickerModal();
  showToast(`Color ${oldColor.id || idx + 1} replaced`);
}
