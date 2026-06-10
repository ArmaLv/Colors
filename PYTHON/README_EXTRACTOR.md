# Color Extraction System

A standalone Python system for extracting dominant colors from images using K-Means clustering algorithm. Generates organized color palettes with JSON metadata and visual palette images.

## Features

- **K-Means++ Clustering**: Advanced color extraction with K-Means++ initialization
- **Medoid Snapping**: Ensures extracted colors are actual colors from the image
- **Flexible Output**: Generates both JSON metadata and palette images
- **Batch Processing**: Process entire directories of images
- **JSON-Driven Updates**: Update palette images by modifying JSON files
- **Custom Identifiers**: Tag extractions with meaningful identifiers
- **Organized Structure**: Automatic directory creation for metadata and images

## Directory Structure

```
extracted_colors/
├── metadata/
│   ├── image_name_identifier_colors.json
│   └── ...
└── palette_images/
    ├── image_name_identifier_1x8.png
    └── ...
```

## Installation

```bash
pip install Pillow numpy
```

## Usage

### 1. Extract Colors from Single Image

```bash
python extractor_py.py image.png -i my_palette -n 8 -o extracted_colors
```

**Parameters:**
- `image.png`: Path to image file
- `-i, --identifier`: Unique identifier for this extraction (default: "default")
- `-n, --num-colors`: Number of colors to extract (default: 8)
- `-o, --output`: Output directory (default: "extracted_colors")

**Output:**
- `metadata/image_my_palette_colors.json`
- `palette_images/image_my_palette_1x8.png`

### 2. Batch Process Directory

```bash
python extractor_py.py ./images -d -p sprite -n 16 -o extracted_colors
```

**Parameters:**
- `./images`: Directory containing images
- `-d, --directory`: Enable directory mode
- `-p, --prefix`: Prefix for identifiers (e.g., "sprite_image1", "sprite_image2")
- `-n, --num-colors`: Colors per image
- `-o, --output`: Output directory

### 3. Update Palette from JSON

Modify the JSON file and regenerate the palette image:

```bash
python extractor_py.py -u metadata/image_old_colors.json --new-identifier new_name
```

**What it does:**
- Reads colors from JSON
- Creates new palette image with new identifier
- Updates JSON metadata with new identifier

## JSON File Format

```json
{
  "image_file_name": "sprite.png",
  "color_file_name": "sprite_v1_colors.json",
  "identifier": "v1",
  "num_colors": 8,
  "colors": [
    "#ffffff",
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff"
  ],
  "created_at": "2026-05-05T12:34:56.789012",
  "image_format": "1xN"
}
```

## Python API

### Direct Usage in Code

```python
from extractor_py import ColorExtractionPipeline

# Create pipeline
pipeline = ColorExtractionPipeline(num_colors=8, output_dir='extracted_colors')

# Process single image
result = pipeline.process_image('image.png', identifier='my_palette')
print(result['colors'])  # List of hex colors

# Process directory
results = pipeline.process_directory('./images', identifier_prefix='sprite')
```

### Using K-Means Extractor Directly

```python
from extractor_py import KMeansColorExtractor

extractor = KMeansColorExtractor(n_clusters=8)
hex_colors, rgb_array = extractor.extract_colors('image.png')
print(hex_colors)  # ['#fff', '#454545', ...]
```

### Using Palette Generator

```python
from extractor_py import ColorPaletteGenerator

generator = ColorPaletteGenerator(output_dir='extracted_colors')

# Generate files
result = generator.generate_palette_files(
    'image.png',
    hex_colors=['#ffffff', '#000000', '#ff0000'],
    identifier='test'
)

# Update from JSON
generator.update_from_json('metadata/image_test_colors.json', new_identifier='test_v2')
```

## Workflow

### Initial Extraction

1. Run extractor on image with identifier
2. Generates JSON and palette image
3. Review extracted colors in `palette_images/`

### Refinement (if needed)

1. Edit JSON file with color changes
2. Run update command with new identifier
3. New palette image created with updated colors

## Features Explained

### K-Means++ Initialization
Better centroid selection using probability weighting, avoiding poor local optima.

### Medoid Snapping
After clustering, centroids "snap" to nearest actual pixel colors, ensuring extracted colors exist in the original image.

### Unique Color Detection
If image has fewer unique colors than requested, returns all of them.

### Pixel Art Support
Works well with both regular photos and pixel art due to K-Means++ and medoid approach.

## Examples

### Extract 16 colors from sprite sheet
```bash
python extractor_py.py sprite.png -i main -n 16
```

### Batch process all PNG files
```bash
python extractor_py.py ./sprites -d -n 8 -p sprite
```

### Update existing palette with new name
```bash
python extractor_py.py -u extracted_colors/metadata/sprite_main_colors.json --new-identifier main_v2
```

## Output Files

Each extraction creates:

1. **JSON Metadata** (`metadata/name_id_colors.json`)
   - Image source info
   - Extracted colors
   - Extraction identifier
   - Timestamp

2. **Palette Image** (`palette_images/name_id_1xN.png`)
   - Visual representation of palette
   - 1 pixel wide × N pixels tall (where N = number of colors)
   - Can be upscaled for viewing (default 16x scale)
   - Shows colors in order

## Tips

- Use descriptive identifiers: `main`, `variant_a`, `alternate`, etc.
- Organize output with multiple subdirectories using different `--output` paths
- Start with `--num-colors 8` for balanced results
- Use higher numbers for complex images, lower for simple ones
- JSON files are human-readable and can be manually edited

## License

Part of the Color Extraction System project.
