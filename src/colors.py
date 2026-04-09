#!/usr/bin/env python3
"""
colors.py — Palette Swapper Backend Server
Extraction, color swapping, and favicon customization endpoints.
Run: python colors.py
Requires: pip install flask pillow
"""

import base64
import io
import math
import os
import subprocess
import sys

try:
    from flask import Flask, request, jsonify, send_from_directory
except ImportError:
    print("Flask not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    from flask import Flask, request, jsonify, send_from_directory

try:
    from PIL import Image
except ImportError:
    print("Pillow not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

# Configuration
HOST = os.environ.get("PALETTE_HOST", "localhost")
PORT = int(os.environ.get("PALETTE_PORT", 5050))
DEBUG = os.environ.get("PALETTE_DEBUG", "false").lower() == "true"

# Magic numbers / algorithm parameters
COLOR_QUANTIZATION_STEP = 4      # Quantize to nearest multiple of 4
ALPHA_THRESHOLD = 128             # Minimum alpha value to process
DEFAULT_MAX_COLORS = 256          # Default max colors for extraction
DEFAULT_TOLERANCE = 10            # Default color matching tolerance
FAVICON_TOLERANCE = 30            # Tolerance for favicon color swapping
PREVIEW_MAX_SIZE = 400            # Maximum dimension for preview images

app = Flask(__name__, static_folder=".", static_url_path="")


def color_distance(c1, c2):
    """Euclidean distance in RGB space."""
    return math.sqrt(
        (c1[0] - c2[0]) ** 2 +
        (c1[1] - c2[1]) ** 2 +
        (c1[2] - c2[2]) ** 2
    )


def swap_colors(img: Image.Image, mappings: list, tolerance: int) -> Image.Image:
    """Replace colors in img according to mappings within tolerance threshold."""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size

    color_map = [(tuple(m["from"]), tuple(m["to"])) for m in mappings]

    for y in range(h):
        for x in range(w):
            pixel = pixels[x, y]
            rgb = pixel[:3]
            best_dist = float("inf")
            replacement = None

            for original_rgb, target_rgb in color_map:
                distance = color_distance(rgb, original_rgb)
                if distance <= tolerance and distance < best_dist:
                    best_dist = distance
                    replacement = target_rgb

            if replacement is not None:
                pixels[x, y] = (*replacement, pixel[3])

    return img


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)


@app.route("/ping")
def ping():
    return jsonify({"status": "ok"})


@app.route("/swap", methods=["POST"])
def swap():
    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "invalid JSON"}), 400

    if data is None or not data:
        return jsonify({"error": "no data provided"}), 400

    img_data = data.get("image", "")
    if not img_data:
        return jsonify({"error": "no image provided"}), 400

    if "," in img_data:
        img_data = img_data.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        return jsonify({"error": f"image decode failed: {e}"}), 400

    mappings = data.get("mappings", [])
    tolerance = int(data.get("tolerance", DEFAULT_TOLERANCE))
    output_format = data.get("format", "png").lower()
    quality = int(data.get("quality", 95))

    # Preview mode: downscale image on backend for quicker live preview responses.
    # Delegates heavy lifting to Python process instead of browser JS thread.
    preview = bool(data.get("preview", False))
    preview_max = int(data.get("preview_max", 0)) or PREVIEW_MAX_SIZE
    if preview:
        try:
            img.thumbnail((preview_max, preview_max), Image.LANCZOS)
        except Exception:
            img.thumbnail((preview_max, preview_max))

    supported_formats = ["png", "jpg", "jpeg", "webp"]
    if output_format not in supported_formats:
        output_format = "png"

    try:
        result_img = swap_colors(img, mappings, tolerance)
    except Exception as e:
        return jsonify({"error": f"swap failed: {e}"}), 500

    buf = io.BytesIO()
    if output_format in ["jpg", "jpeg"]:
        result_img.save(buf, format="JPEG", quality=quality)
        mime = "image/jpeg"
    elif output_format == "webp":
        result_img.save(buf, format="WEBP", quality=quality)
        mime = "image/webp"
    else:
        result_img.save(buf, format="PNG")
        mime = "image/png"

    b64 = base64.b64encode(buf.getvalue()).decode()
    result_data_url = f"data:{mime};base64,{b64}"

    return jsonify({
        "result": result_data_url,
        "format": output_format,
        "size": len(b64)
    })


@app.route("/extract", methods=["POST"])
def extract():
    """Extract colors from an image (optional backend feature)."""
    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "invalid JSON"}), 400

    if data is None:
        return jsonify({"error": "no data provided"}), 400

    img_data = data.get("image", "")
    if not img_data:
        return jsonify({"error": "no image provided"}), 400

    if "," in img_data:
        img_data = img_data.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        return jsonify({"error": f"image decode failed: {e}"}), 400

    max_colors = int(data.get("max_colors", DEFAULT_MAX_COLORS))
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size

    color_freq = {}
    for y in range(h):
        for x in range(w):
            pixel = pixels[x, y]
            if pixel[3] < ALPHA_THRESHOLD:
                continue
            r, g, b = pixel[0], pixel[1], pixel[2]
            # Quantize color to nearest step size
            qr = int(round(r / COLOR_QUANTIZATION_STEP) * COLOR_QUANTIZATION_STEP)
            qg = int(round(g / COLOR_QUANTIZATION_STEP) * COLOR_QUANTIZATION_STEP)
            qb = int(round(b / COLOR_QUANTIZATION_STEP) * COLOR_QUANTIZATION_STEP)
            key = (qr << 16) | (qg << 8) | qb
            color_freq[key] = color_freq.get(key, 0) + 1

    sorted_colors = sorted(color_freq.items(), key=lambda x: x[1], reverse=True)[:max_colors]
    colors = [
        {
            "r": (key >> 16) & 0xFF,
            "g": (key >> 8) & 0xFF,
            "b": key & 0xFF,
            "count": count
        }
        for key, count in sorted_colors
    ]

    return jsonify({"colors": colors})


@app.route("/swap-favicon", methods=["POST"])
def swap_favicon():
    """Swap favicon colors based on provided color mapping."""
    try:
        data = request.get_json()
    except Exception:
        return jsonify({"error": "invalid JSON"}), 400

    if data is None:
        return jsonify({"error": "no data provided"}), 400

    target_colors = data.get("colors", [])
    if len(target_colors) < 10:
        return jsonify({"error": "need 10 target colors"}), 400

    # Original favicon palette (10 base colors in RGB tuples)
    base_colors = [
        (0x00, 0x00, 0x00),  # #000000 - black
        (0xac, 0x54, 0x38),  # #ac5438 - dark red-brown
        (0xff, 0xf0, 0xe8),  # #fff0e8 - pale cream
        (0xff, 0xcc, 0xac),  # #ffccac - pale orange
        (0x60, 0x58, 0x50),  # #605850 - dark gray
        (0x1c, 0x2c, 0x54),  # #1c2c54 - dark blue
        (0xc4, 0xc4, 0xc8),  # #c4c4c8 - light gray
        (0x84, 0x78, 0x9c),  # #84789c - muted purple
        (0x80, 0x24, 0x54),  # #802454 - dark magenta
        (0xff, 0x78, 0xa8),  # #ff78a8 - bright pink
    ]

    target_rgb = []
    for c in target_colors[:10]:
        if isinstance(c, dict):
            target_rgb.append((c.get("r", 0), c.get("g", 0), c.get("b", 0)))
        elif isinstance(c, (list, tuple)) and len(c) >= 3:
            target_rgb.append((c[0], c[1], c[2]))
        else:
            target_rgb.append((0, 0, 0))

    favicon_png = os.path.join(os.path.dirname(__file__), "favicon-source.png")

    if not os.path.exists(favicon_png):
        return jsonify({"error": "favicon-source.png not found"}), 404

    try:
        img = Image.open(favicon_png).convert("RGBA")
    except Exception as e:
        return jsonify({"error": f"failed to load favicon: {e}"}), 500

    mappings = []
    for base, target in zip(base_colors, target_rgb):
        mappings.append({"from": base, "to": target})

    tolerance = int(data.get("tolerance", FAVICON_TOLERANCE))
    try:
        result_img = swap_colors(img, mappings, tolerance)
    except Exception as e:
        return jsonify({"error": f"swap failed: {e}"}), 500

    buf = io.BytesIO()
    result_img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    result_data_url = f"data:image/png;base64,{b64}"

    return jsonify({
        "result": result_data_url,
        "format": "png"
    })


def main():
    print(f"""
================================================
   Palette Swapper Server v2.0
   Running on http://{HOST}:{PORT}

   Open http://localhost:{PORT} in your browser
   Press Ctrl+C to stop
================================================
""")
    app.run(host=HOST, port=PORT, debug=DEBUG)


if __name__ == "__main__":
    main()
