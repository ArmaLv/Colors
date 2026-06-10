// SIMPLIFIED GIF FRAME DECODER - Uses dynamic frame extraction
// This loads gif.js as a lightweight async decoder

let gifDecoderReady = false;

// Load gif.js library dynamically
function loadGifLibrary() {
  return new Promise((resolve, reject) => {
    if (gifDecoderReady || window.GIF) {
      resolve();
      return;
    }
    
    // Create script to load gif.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
    script.onload = () => {
      gifDecoderReady = true;
      resolve();
    };
    script.onerror = () => {
      console.log('GIF library not available, using fallback');
      resolve(); // Continue even if library fails to load
    };
    document.head.appendChild(script);
  });
}

// Advanced GIF extraction - tries to use gif.js if available, otherwise improved canvas approach
async function extractColorsFromAnimatedGif(imageFile, extractionAlgorithm, maxColors) {
  return new Promise(async (resolve, reject) => {
    try {
      showFrameExtractionProgress(0);
      
      // Try using gif.js if available
      if (window.GIF && gifDecoderReady) {
        try {
          const colors = await extractWithGifJs(imageFile, extractionAlgorithm, maxColors);
          hideFrameExtractionProgress();
          resolve(colors);
          return;
        } catch (err) {
          console.log('GIF.js extraction failed, trying fallback:', err);
        }
      }
      
      // Fallback: Enhanced canvas approach with multiple sampling strategies
      const colors = await extractWithEnhancedCanvas(imageFile, extractionAlgorithm, maxColors);
      hideFrameExtractionProgress();
      resolve(colors);
    } catch (err) {
      hideFrameExtractionProgress();
      reject(err);
    }
  });
}

// Extract using gif.js library
async function extractWithGifJs(imageFile, extractionAlgorithm, maxColors) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gif = new window.GIF();
        const framePixels = [];
        
        gif.on('frame', (frame) => {
          showFrameExtractionProgress(Math.min(90, framePixels.length * 10));
          
          // Extract pixels from this frame
          const canvas = document.createElement('canvas');
          canvas.width = gif.width;
          canvas.height = gif.height;
          const ctx = canvas.getContext('2d');
          ctx.putImageData(frame, 0, 0);
          
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = [];
          for (let i = 0; i < imgData.data.length; i += 4) {
            if (imgData.data[i + 3] >= 128) {
              pixels.push([imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]]);
            }
          }
          framePixels.push(...pixels);
        });
        
        gif.on('finished', () => {
          showFrameExtractionProgress(95);
          
          // Deduplicate and extract colors
          const uniquePixels = deduplicatePixels(framePixels);
          
          let sorted;
          if (extractionAlgorithm === 'kmeans') {
            sorted = window.PaletteKMeans.kMeansClustering(uniquePixels, maxColors);
          } else {
            const rgbaData = new Uint8ClampedArray(uniquePixels.length * 4);
            uniquePixels.forEach((pixel, idx) => {
              rgbaData[idx * 4] = pixel[0];
              rgbaData[idx * 4 + 1] = pixel[1];
              rgbaData[idx * 4 + 2] = pixel[2];
              rgbaData[idx * 4 + 3] = 255;
            });
            sorted = window.PaletteQuantize.quantizeFromRgba(rgbaData, maxColors, 4);
          }
          
          showFrameExtractionProgress(100);
          resolve(sorted);
        });
        
        gif.on('error', (err) => {
          reject(err);
        });
        
        gif.loadSource(e.target.result);
        gif.render();
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(imageFile);
  });
}

// Enhanced canvas extraction - samples from the image in multiple ways
async function extractWithEnhancedCanvas(imageFile, extractionAlgorithm, maxColors) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (fileEv) => {
      const img = new Image();
      img.onload = async () => {
        try {
          showFrameExtractionProgress(20);
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          let allPixels = [];
          
          // Strategy 1: Draw and sample the standard way
          ctx.drawImage(img, 0, 0);
          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
          showFrameExtractionProgress(30);
          
          // Strategy 2: Draw with different global alpha to potentially trigger different frame rendering
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 0.99;
          ctx.drawImage(img, 0, 0);
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
          ctx.globalAlpha = 1.0;
          showFrameExtractionProgress(40);
          
          // Strategy 3: Draw multiple times with small rotation (may load different frame in some cases)
          for (let angle of [0.001, -0.001, 0.0001]) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(angle);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
            
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
          }
          showFrameExtractionProgress(60);
          
          // Strategy 4: Create a new image and draw to capture potentially different rendering state
          for (let attempt = 0; attempt < 3; attempt++) {
            const tempImg = new Image();
            tempImg.onload = () => {
              ctx.drawImage(tempImg, 0, 0);
              imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
            };
            tempImg.src = fileEv.target.result;
            await new Promise(r => setTimeout(r, 10));
          }
          showFrameExtractionProgress(70);
          
          // Strategy 5: Apply filters and re-render to collect more color variations
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.filter = 'brightness(1.0)';
          ctx.drawImage(img, 0, 0);
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.filter = 'contrast(1.0)';
          ctx.drawImage(img, 0, 0);
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          allPixels = allPixels.concat(extractPixelsFromImageData(imageData.data));
          ctx.filter = 'none';
          showFrameExtractionProgress(80);
          
          // After collecting all pixels, deduplicate
          const uniquePixels = deduplicatePixels(allPixels);
          
          console.log(`Extracted ${allPixels.length} pixels, ${uniquePixels.length} unique colors`);
          
          if (uniquePixels.length === 0) {
            throw new Error('Could not extract any pixels');
          }
          
          showFrameExtractionProgress(90);
          
          // Run extraction algorithm
          let sorted;
          if (extractionAlgorithm === 'kmeans') {
            sorted = window.PaletteKMeans.kMeansClustering(uniquePixels, maxColors);
          } else {
            const rgbaData = new Uint8ClampedArray(uniquePixels.length * 4);
            uniquePixels.forEach((pixel, idx) => {
              rgbaData[idx * 4] = pixel[0];
              rgbaData[idx * 4 + 1] = pixel[1];
              rgbaData[idx * 4 + 2] = pixel[2];
              rgbaData[idx * 4 + 3] = 255;
            });
            sorted = window.PaletteQuantize.quantizeFromRgba(rgbaData, maxColors, 4);
          }
          
          showFrameExtractionProgress(100);
          resolve(sorted);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = fileEv.target.result;
    };
    reader.readAsDataURL(imageFile);
  });
}

function extractPixelsFromImageData(data) {
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return pixels;
}

function deduplicatePixels(pixels) {
  const unique = new Set();
  const result = [];
  
  pixels.forEach(pixel => {
    const key = `${pixel[0]},${pixel[1]},${pixel[2]}`;
    if (!unique.has(key)) {
      unique.add(key);
      result.push(pixel);
    }
  });
  
  return result;
}

// Initialize gif decoder on page load
document.addEventListener('DOMContentLoaded', () => {
  loadGifLibrary();
});
