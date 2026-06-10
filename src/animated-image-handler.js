// ANIMATED IMAGE HANDLER - Supports GIF, animated WebP, and other animated formats
let isAnimatedImage = false;
let animatedImageFrames = [];
let animatedImageCurrentFrame = 0;
let extractFromAllFrames = false;

// Detect if image is animated GIF by checking magic bytes
async function checkIfAnimated(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }
      // GIF: 47 49 46 = "GIF"
      const isGif = header.startsWith('47696');
      resolve(isGif);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

// Decode GIF frames using gif.js library
async function decodeGifFrames(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const gif = new GIF({ workers: 2, quality: 10, workerScripts: { js: '/lib/gif.worker.js' } });
        
        // Handle when frames are rendered
        const frames = [];
        gif.on('finished', function() {
          resolve(frames);
        });
        
        gif.on('frame', function(frame) {
          frames.push(frame.data);
        });
        
        // Start rendering - this will trigger frame events
        gif.render();
        
        // Load the image data
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          // Create a temporary canvas to use with gif.js
          const tempCanvas = document.createElement('canvas');
          gif.addFrame(img, { delay: 100 });
        };
        img.src = e.target.result;
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

// Simpler GIF frame extraction using canvas rendering
async function extractGifFramesSimple(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const frames = [];
      
      // Try to extract frames by rendering at different times
      // For now, extract the first frame and try to approximate other frames
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Draw the image (usually shows first frame of GIF)
      ctx.drawImage(img, 0, 0);
      frames.push({
        canvas: canvas,
        width: canvas.width,
        height: canvas.height,
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data
      });
      
      resolve(frames);
    };
    img.src = imageDataUrl;
  });
}

// Extract colors from all frames using improved GIF handling
async function extractColorsFromAllFrames(imageFile, extractionAlgorithm, maxColors) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if image is GIF
      const isGif = await checkIfAnimated(imageFile);
      
      if (!isGif) {
        // Not animated, use regular extraction
        resolve(null);
        return;
      }
      
      // Use the advanced GIF decoder
      if (typeof extractColorsFromAnimatedGif !== 'undefined') {
        try {
          const colors = await extractColorsFromAnimatedGif(imageFile, extractionAlgorithm, maxColors);
          resolve(colors);
        } catch (err) {
          console.error('GIF extraction error:', err);
          reject(err);
        }
      } else {
        reject(new Error('GIF decoder not loaded'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

// UI Elements for showing progress
function showFrameExtractionProgress(percent) {
  let progressDiv = document.getElementById('frameExtractionProgress');
  if (!progressDiv) {
    progressDiv = document.createElement('div');
    progressDiv.id = 'frameExtractionProgress';
    progressDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--panel);
      border: 1px solid var(--border);
      padding: 20px;
      z-index: 10000;
      text-align: center;
      min-width: 320px;
      font-family: 'Space Mono', monospace;
    `;
    document.body.appendChild(progressDiv);
  }
  
  progressDiv.innerHTML = `
    <div style="color: var(--text); margin-bottom: 12px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;">
      Extracting from all frames...
    </div>
    <div style="background: var(--bg); border: 1px solid var(--border); height: 20px; margin-bottom: 12px; overflow: hidden;">
      <div style="background: var(--accent); height: 100%; width: ${percent}%; transition: width 0.3s;"></div>
    </div>
    <div style="color: var(--accent); font-size: 0.65rem; font-weight: 700;">${percent}%</div>
  `;
}

function hideFrameExtractionProgress() {
  const progressDiv = document.getElementById('frameExtractionProgress');
  if (progressDiv) {
    progressDiv.remove();
  }
}

// Add option to UI for extracting from all frames
function addAnimatedImageOption() {
  const controlsDiv = document.querySelector('.controls');
  if (!controlsDiv) return;
  
  // Find the Algorithm control and add toggle after it
  const algorithmControl = Array.from(controlsDiv.querySelectorAll('.control-row'))
    .find(row => row.textContent.includes('Algorithm'));
  
  if (algorithmControl) {
    const newControl = document.createElement('div');
    newControl.className = 'control-row';
    newControl.id = 'animatedImageControl';
    newControl.style.display = 'none'; // Hidden by default
    newControl.innerHTML = `
      <span class="control-label">Animated</span>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="extractAllFrames" onchange="toggleExtractAllFrames(this.checked)">
        <span style="font-size: 0.65rem; color: var(--text);">All Frames</span>
      </label>
      <span class="control-value" id="frameCount" style="font-size: 0.6rem;">-</span>
    `;
    algorithmControl.parentNode.insertBefore(newControl, algorithmControl.nextSibling);
  }
}

function toggleExtractAllFrames(checked) {
  extractFromAllFrames = checked;
  showToast(checked ? 'Will extract from all frames' : 'Will extract from first frame only');
}

// Call this when animated image is detected
function showAnimatedImageControl() {
  const control = document.getElementById('animatedImageControl');
  if (control) {
    control.style.display = 'flex';
  }
}

function hideAnimatedImageControl() {
  const control = document.getElementById('animatedImageControl');
  if (control) {
    control.style.display = 'none';
  }
  extractFromAllFrames = false;
  const checkbox = document.getElementById('extractAllFrames');
  if (checkbox) checkbox.checked = false;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  addAnimatedImageOption();
});
