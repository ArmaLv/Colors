(function (global) {
  'use strict';

  // Detect if image is pixel art (low color count or small dimensions)
  // Returns estimated pixel size (e.g., 2 = 2x2 pixel art, 1 = regular image)
  function detectPixelArtStyle(pixels, canvasWidth, canvasHeight) {
    var uniqueColorMap = new Map();
    for (var i = 0; i < pixels.length; i++) {
      var p = pixels[i];
      var key = (p[0] << 16) | (p[1] << 8) | p[2];
      uniqueColorMap.set(key, (uniqueColorMap.get(key) || 0) + 1);
    }
    var uniqueCount = uniqueColorMap.size;

    // If very few colors relative to pixels, likely pixel art
    var colorDensity = uniqueCount / pixels.length;
    var isSparsePalette = colorDensity > 0.001; // More than 1 in 1000 pixels is unique

    // If image is small, likely pixel art
    var isSmallImage = (canvasWidth <= 128 && canvasHeight <= 128) || (canvasWidth * canvasHeight <= 16384);

    if (isSmallImage || isSparsePalette) {
      return { isPixelArt: true, uniqueColors: uniqueCount };
    }
    return { isPixelArt: false, uniqueColors: uniqueCount };
  }

  function kMeansClustering(pixels, k, maxIterations) {
    var iterations = typeof maxIterations === 'number' ? maxIterations : 20;
    if (!pixels || pixels.length === 0) return [];

    // If already have fewer or equal colors than k, just return them
    if (pixels.length <= k) {
      var seen = new Map();
      var result = [];
      for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        var key = (p[0] << 16) | (p[1] << 8) | p[2];
        if (!seen.has(key)) {
          seen.set(key, true);
          result.push({ r: p[0], g: p[1], b: p[2], count: 1 });
        }
      }
      return result;
    }

    // K-means++ initialization (better centroid seed selection)
    var centroids = [];
    var firstIdx = Math.floor(Math.random() * pixels.length);
    centroids.push([pixels[firstIdx][0], pixels[firstIdx][1], pixels[firstIdx][2]]);

    // Add remaining k-1 centroids using k-means++ probability weighting
    for (var initIdx = 1; initIdx < k; initIdx++) {
      var distances = [];
      var maxDist = 0;

      for (var p = 0; p < pixels.length; p++) {
        var pixel = pixels[p];
        var minDist = Infinity;

        for (var c = 0; c < centroids.length; c++) {
          var dr = pixel[0] - centroids[c][0];
          var dg = pixel[1] - centroids[c][1];
          var db = pixel[2] - centroids[c][2];
          var dist = dr * dr + dg * dg + db * db; // squared distance
          if (dist < minDist) minDist = dist;
        }

        distances[p] = minDist;
        if (minDist > maxDist) maxDist = minDist;
      }

      // Pick next centroid weighted by distance
      var cumulDist = [];
      var sum = 0;
      for (var pd = 0; pd < distances.length; pd++) {
        sum += distances[pd];
        cumulDist[pd] = sum;
      }

      var pickVal = Math.random() * sum;
      for (var pickIdx = 0; pickIdx < cumulDist.length; pickIdx++) {
        if (cumulDist[pickIdx] >= pickVal) {
          centroids.push([pixels[pickIdx][0], pixels[pickIdx][1], pixels[pickIdx][2]]);
          break;
        }
      }
    }

    // K-means iterations
    for (var iter = 0; iter < iterations; iter++) {
      var clusters = Array.from({ length: k }, function () { return []; });

      // Assign pixels to nearest centroid
      for (var pa = 0; pa < pixels.length; pa++) {
        var pix = pixels[pa];
        var min = Infinity;
        var cidx = 0;
        for (var ci = 0; ci < centroids.length; ci++) {
          var d = (pix[0] - centroids[ci][0]) * (pix[0] - centroids[ci][0]) +
                  (pix[1] - centroids[ci][1]) * (pix[1] - centroids[ci][1]) +
                  (pix[2] - centroids[ci][2]) * (pix[2] - centroids[ci][2]);
          if (d < min) { min = d; cidx = ci; }
        }
        clusters[cidx].push(pix);
      }

      var converged = true;

      // Update centroids & snap to nearest actual pixel color (medoid)
      for (var uc = 0; uc < k; uc++) {
        if (clusters[uc].length === 0) continue;

        // Compute centroid (average)
        var sumR = 0, sumG = 0, sumB = 0;
        for (var cx = 0; cx < clusters[uc].length; cx++) {
          sumR += clusters[uc][cx][0];
          sumG += clusters[uc][cx][1];
          sumB += clusters[uc][cx][2];
        }
        var avgR = Math.round(sumR / clusters[uc].length);
        var avgG = Math.round(sumG / clusters[uc].length);
        var avgB = Math.round(sumB / clusters[uc].length);

        // Find nearest actual color in cluster (medoid) for pixel art accuracy
        var bestPixel = clusters[uc][0];
        var bestDist = Infinity;
        for (var mp = 0; mp < clusters[uc].length; mp++) {
          var edist = (clusters[uc][mp][0] - avgR) * (clusters[uc][mp][0] - avgR) +
                      (clusters[uc][mp][1] - avgG) * (clusters[uc][mp][1] - avgG) +
                      (clusters[uc][mp][2] - avgB) * (clusters[uc][mp][2] - avgB);
          if (edist < bestDist) { bestDist = edist; bestPixel = clusters[uc][mp]; }
        }

        var newCenter = [bestPixel[0], bestPixel[1], bestPixel[2]];

        if (newCenter[0] !== centroids[uc][0] || newCenter[1] !== centroids[uc][1] || newCenter[2] !== centroids[uc][2]) {
          converged = false;
        }
        centroids[uc] = newCenter;
      }

      if (converged) break;
    }

    // Count and deduplicate
    var counts = Array(k).fill(0);
    for (var nc = 0; nc < pixels.length; nc++) {
      var npx = pixels[nc];
      var mnd = Infinity;
      var midx = 0;
      for (var nci = 0; nci < centroids.length; nci++) {
        var nd = (npx[0] - centroids[nci][0]) * (npx[0] - centroids[nci][0]) +
                (npx[1] - centroids[nci][1]) * (npx[1] - centroids[nci][1]) +
                (npx[2] - centroids[nci][2]) * (npx[2] - centroids[nci][2]);
        if (nd < mnd) { mnd = nd; midx = nci; }
      }
      counts[midx]++;
    }

    return centroids
      .map(function (c3, i3) {
        return { r: c3[0], g: c3[1], b: c3[2], count: counts[i3] };
      })
      .filter(function (c4) { return c4.count > 0; });
  }

  function kmeansQuantize(imageData, maxColors) {
    var limit = typeof maxColors === 'number' ? maxColors : 128;
    var data = imageData.data;

    var pixels = [];
    var colorFreq = new Map();
    var toKey = global.PaletteBase && global.PaletteBase.rgbKey
      ? global.PaletteBase.rgbKey
      : function (r, g, b) { return (r << 16) | (g << 8) | b; };

    // Collect all unique colors first (important for pixel art!)
    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3];
      if (a < 128) continue;
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      pixels.push({ r: r, g: g, b: b });
      var key = toKey(r, g, b);
      colorFreq.set(key, (colorFreq.get(key) || 0) + 1);
    }

    if (pixels.length === 0) return [];

    // If unique color count is already at or below limit, return existing colors
    var uniqueCount = colorFreq.size;
    if (uniqueCount <= limit) {
      return Array.from(colorFreq.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .map(function (entry) {
          return {
            r: (entry[0] >> 16) & 0xff,
            g: (entry[0] >> 8) & 0xff,
            b: entry[0] & 0xff
          };
        });
    }

    // Convert to array format [r, g, b] for k-means
    var pixelArray = [];
    for (var pi = 0; pi < pixels.length; pi++) {
      var px = pixels[pi];
      pixelArray.push([px.r, px.g, px.b]);
    }

    // K-means++ initialization
    var centers = [];
    var firstIdx = Math.floor(Math.random() * pixelArray.length);
    centers.push([pixelArray[firstIdx][0], pixelArray[firstIdx][1], pixelArray[firstIdx][2]]);

    for (var initIdx = 1; initIdx < limit; initIdx++) {
      var dists = [];
      var maxD = 0;

      for (var pa = 0; pa < pixelArray.length; pa++) {
        var minD = Infinity;
        for (var ca = 0; ca < centers.length; ca++) {
          var dr = pixelArray[pa][0] - centers[ca][0];
          var dg = pixelArray[pa][1] - centers[ca][1];
          var db = pixelArray[pa][2] - centers[ca][2];
          var dist = dr * dr + dg * dg + db * db;
          if (dist < minD) minD = dist;
        }
        dists[pa] = minD;
        if (minD > maxD) maxD = minD;
      }

      var cumul = [];
      var sum = 0;
      for (var pd = 0; pd < dists.length; pd++) {
        sum += dists[pd];
        cumul[pd] = sum;
      }

      var rval = Math.random() * sum;
      for (var ri = 0; ri < cumul.length; ri++) {
        if (cumul[ri] >= rval) {
          centers.push([pixelArray[ri][0], pixelArray[ri][1], pixelArray[ri][2]]);
          break;
        }
      }
    }

    // K-means iterations with medoid snapping (snap to actual colors)
    var maxIterations = 15;
    for (var iter = 0; iter < maxIterations; iter++) {
      var clusters = Array(centers.length).fill(null).map(function () { return []; });

      // Assign to nearest center
      for (var paa = 0; paa < pixelArray.length; paa++) {
        var px2 = pixelArray[paa];
        var mind = Infinity;
        var cidx = 0;
        for (var caa = 0; caa < centers.length; caa++) {
          var dist = (px2[0] - centers[caa][0]) * (px2[0] - centers[caa][0]) +
                    (px2[1] - centers[caa][1]) * (px2[1] - centers[caa][1]) +
                    (px2[2] - centers[caa][2]) * (px2[2] - centers[caa][2]);
          if (dist < mind) { mind = dist; cidx = caa; }
        }
        clusters[cidx].push(px2);
      }

      var moved = false;

      // Update centers using medoid (nearest actual color to average)
      for (var cci = 0; cci < centers.length; cci++) {
        if (clusters[cci].length === 0) continue;

        // Compute average
        var sumR = 0, sumG = 0, sumB = 0;
        for (var cix = 0; cix < clusters[cci].length; cix++) {
          sumR += clusters[cci][cix][0];
          sumG += clusters[cci][cix][1];
          sumB += clusters[cci][cix][2];
        }
        var avgR = Math.round(sumR / clusters[cci].length);
        var avgG = Math.round(sumG / clusters[cci].length);
        var avgB = Math.round(sumB / clusters[cci].length);

        // Find nearest actual pixel in cluster
        var bestPx = clusters[cci][0];
        var bestDist = Infinity;
        for (var mpx = 0; mpx < clusters[cci].length; mpx++) {
          var edist = (clusters[cci][mpx][0] - avgR) * (clusters[cci][mpx][0] - avgR) +
                     (clusters[cci][mpx][1] - avgG) * (clusters[cci][mpx][1] - avgG) +
                     (clusters[cci][mpx][2] - avgB) * (clusters[cci][mpx][2] - avgB);
          if (edist < bestDist) { bestDist = edist; bestPx = clusters[cci][mpx]; }
        }

        var newC = [bestPx[0], bestPx[1], bestPx[2]];
        if (newC[0] !== centers[cci][0] || newC[1] !== centers[cci][1] || newC[2] !== centers[cci][2]) {
          moved = true;
        }
        centers[cci] = newC;
      }

      if (!moved) break;
    }

    // Final frequency count
    var finalFreq = new Map();
    for (var fpc = 0; fpc < pixelArray.length; fpc++) {
      var fpx = pixelArray[fpc];
      var minF = Infinity;
      var bidx = 0;
      for (var fcaa = 0; fcaa < centers.length; fcaa++) {
        var fdist = (fpx[0] - centers[fcaa][0]) * (fpx[0] - centers[fcaa][0]) +
                   (fpx[1] - centers[fcaa][1]) * (fpx[1] - centers[fcaa][1]) +
                   (fpx[2] - centers[fcaa][2]) * (fpx[2] - centers[fcaa][2]);
        if (fdist < minF) { minF = fdist; bidx = fcaa; }
      }
      var fkey = toKey(centers[bidx][0], centers[bidx][1], centers[bidx][2]);
      finalFreq.set(fkey, (finalFreq.get(fkey) || 0) + 1);
    }

    return Array.from(finalFreq.entries())
      .sort(function (a, b) { return b[1] - a[1]; })
      .map(function (entry) {
        return {
          r: (entry[0] >> 16) & 0xff,
          g: (entry[0] >> 8) & 0xff,
          b: entry[0] & 0xff
        };
      });
  }

  global.PaletteKMeans = {
    kMeansClustering: kMeansClustering,
    kmeansQuantize: kmeansQuantize,
    detectPixelArtStyle: detectPixelArtStyle
  };
})(window);
