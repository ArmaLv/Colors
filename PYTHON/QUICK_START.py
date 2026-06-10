"""
QUICK START GUIDE - Color Extraction System
"""

# ============================================================================
# INSTALLATION
# ============================================================================

# 1. Install dependencies
# pip install -r requirements.txt

# Or manually:
# pip install Pillow numpy


# ============================================================================
# COMMAND LINE USAGE (Terminal/PowerShell)
# ============================================================================

# Extract colors from single image
# python extractor_py.py image.png -i my_palette

# Extract 16 colors instead of default 8
# python extractor_py.py image.png -i main -n 16

# Process all images in a folder
# python extractor_py.py ./sprites -d -n 8

# Batch process with prefix
# python extractor_py.py ./sprites -d -p sprite -n 8

# Update palette image with new identifier
# python extractor_py.py -u extracted_colors/metadata/image_v1_colors.json --new-identifier v2


# ============================================================================
# PYTHON CODE USAGE
# ============================================================================

from extractor_py import ColorExtractionPipeline

# Create pipeline (8 colors by default)
pipeline = ColorExtractionPipeline(num_colors=8, output_dir='extracted_colors')

# Process single image
result = pipeline.process_image('image.png', identifier='main')

# Access results
print(result['colors'])           # List of hex colors
print(result['metadata_file'])    # Path to JSON
print(result['image_file'])       # Path to palette PNG


# Process entire directory
results = pipeline.process_directory(
    './images',
    identifier_prefix='sprite',
    image_extensions=['.png', '.jpg']
)


# ============================================================================
# OUTPUT STRUCTURE
# ============================================================================

# extracted_colors/
# ├── metadata/
# │   └── image_main_colors.json
# └── palette_images/
#     └── image_main_1x8.png


# ============================================================================
# JSON FORMAT
# ============================================================================

# {
#   "image_file_name": "image.png",
#   "color_file_name": "image_main_colors.json",
#   "identifier": "main",
#   "num_colors": 8,
#   "colors": [
#     "#ffffff",
#     "#000000",
#     "#ff0000",
#     "#00ff00",
#     "#0000ff",
#     "#ffff00",
#     "#ff00ff",
#     "#00ffff"
#   ],
#   "created_at": "2026-05-05T12:34:56.789012",
#   "image_format": "1xN"
# }


# ============================================================================
# WORKFLOW
# ============================================================================

# Step 1: Extract colors
# python extractor_py.py sprite.png -i v1 -n 16

# Step 2: Review palette_images/sprite_v1_1x16.png

# Step 3: If you want to update, regenerate with new identifier
# python extractor_py.py -u extracted_colors/metadata/sprite_v1_colors.json --new-identifier v2

# Step 4: Now you have sprite_v2_1x16.png with same colors


# ============================================================================
# ADVANCED USAGE
# ============================================================================

from extractor_py import KMeansColorExtractor, ColorPaletteGenerator

# Use extractor directly
extractor = KMeansColorExtractor(n_clusters=8, max_iterations=100)
hex_colors, rgb_array = extractor.extract_colors('image.png')

# Use generator directly
generator = ColorPaletteGenerator(output_dir='extracted_colors')
result = generator.generate_palette_files(
    'image.png',
    hex_colors=['#fff', '#000', '#f00'],
    identifier='custom'
)

# Update from JSON
generator.update_from_json(
    'extracted_colors/metadata/image_custom_colors.json',
    new_identifier='custom_v2'
)


# ============================================================================
# TIPS
# ============================================================================

# 1. Start with default 8 colors
# python extractor_py.py image.png -i test

# 2. Increase colors for detailed images (16-32)
# python extractor_py.py image.png -i detailed -n 32

# 3. Use descriptive identifiers
# main, variant_a, dark_mode, light_mode, etc.

# 4. Batch process with meaningful prefix
# python extractor_py.py ./assets -d -p player -n 8

# 5. Version your extractions
# v1, v1_refined, v2, v2_final, etc.

# 6. JSON files are human-editable
# Manually remove/add colors if needed, then regenerate


# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Q: ImportError: No module named 'PIL'
# A: pip install Pillow

# Q: ImportError: No module named 'numpy'
# A: pip install numpy

# Q: FileNotFoundError: Image not found
# A: Use absolute path or correct relative path to image

# Q: No colors extracted
# A: Check image format is supported (PNG, JPG, GIF, BMP, WEBP)

# Q: Want to process a different image format?
# A: Add extension to image_extensions list
# pipeline.process_directory('./images', image_extensions=['.png', '.jpg', '.webp'])
