(function (global) {
  'use strict';

  function quantizeFromRgba(data, maxColors, bucketSize) {
    var colorMap = new Map();
    var step = Math.max(1, bucketSize | 0);
    var clamp = global.PaletteBase && global.PaletteBase.clampChannel
      ? global.PaletteBase.clampChannel
      : function (v) { return v < 0 ? 0 : (v > 255 ? 255 : v); };
    var toKey = global.PaletteBase && global.PaletteBase.rgbKey
      ? global.PaletteBase.rgbKey
      : function (r, g, b) { return (r << 16) | (g << 8) | b; };
    var fromKey = global.PaletteBase && global.PaletteBase.keyToRgb
      ? global.PaletteBase.keyToRgb
      : function (key) {
          return {
            r: (key >> 16) & 0xff,
            g: (key >> 8) & 0xff,
            b: key & 0xff
          };
        };

    for (var i = 0; i < data.length; i += 4) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var a = data[i + 3];
      if (a < 128) continue;

      var qr = clamp(Math.round(r / step) * step);
      var qg = clamp(Math.round(g / step) * step);
      var qb = clamp(Math.round(b / step) * step);
      var key = toKey(qr, qg, qb);
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    return Array.from(colorMap.entries())
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, maxColors)
      .map(function (entry) {
        var rgb = fromKey(entry[0]);
        return { r: rgb.r, g: rgb.g, b: rgb.b, count: entry[1] };
      });
  }

  function quantizeImageData(imageData, maxColors, bucketSize, includeCount) {
    var rows = quantizeFromRgba(imageData.data, maxColors, bucketSize);
    if (includeCount) return rows;
    return rows.map(function (c) { return { r: c.r, g: c.g, b: c.b }; });
  }

  global.PaletteQuantize = {
    quantizeFromRgba: quantizeFromRgba,
    quantizeImageData: quantizeImageData
  };
})(window);
