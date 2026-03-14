# Palette.exe

Palette.exe is a browser-based color toolkit for extracting palettes from images, swapping image colors, and managing reusable palettes.

## Origin

Palette.exe was originally meant for pixel art style that has no more than 250 colors, but with random resting chose to increase to 1080 colors, there may be some weirdness with colors more than 250

## Features

- Extract dominant colors from uploaded images
- Sort and filter extracted colors
- Export palettes in multiple formats
- Swap image colors using editable color mapping
- Save and manage palettes in local storage
- Theme presets with dynamic favicon/logo recoloring
- Optional backend support for faster image operations

## Project Structure

- `index.html` — Main UI markup
- `styles.css` — Main app styles
- `colorpicker.css` — Color picker styles
- `script.js` — App logic and state handling
- `colorpicker.js` — Custom color picker component
- `manifest.json` — PWA metadata
- `colors.py` — Local Flask backend for swap/extract/favicon endpoints

## Requirements

### Frontend only

- Any modern browser

### With backend enabled

- Python 3.9+
- `flask`
- `pillow`

The backend script can auto-install missing Python packages on first run.

## Run

### Option 1: Frontend only

Open `index.html` in your browser.

### Option 2: Frontend + local backend

From this folder, run:

```bash
python colors.py
```

Then open:

- `http://localhost:5050`

## Notes

- The app stores theme state, saved palettes, and some working data in browser local storage.
- When backend is offline, the app falls back to browser-side processing where supported.

## License

No license file is currently defined in this repository.
