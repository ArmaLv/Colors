"""
Example usage of the Color Extraction System
Demonstrates various ways to use the extractor
"""

from pathlib import Path
from extractor_py import (
    ColorExtractionPipeline,
    KMeansColorExtractor,
    ColorPaletteGenerator
)


def example_1_single_image_extraction():
    """Example 1: Extract colors from a single image"""
    print("\n=== Example 1: Single Image Extraction ===\n")
    
    # Create pipeline
    pipeline = ColorExtractionPipeline(num_colors=8, output_dir='extracted_colors')
    
    # Process image
    # result = pipeline.process_image('path/to/image.png', identifier='main')
    
    print("To run: Uncomment the line above and provide a valid image path")
    print("result = pipeline.process_image('path/to/image.png', identifier='main')")
    print("\nResult contains:")
    print("  - colors: List of extracted hex colors")
    print("  - metadata_file: Path to JSON")
    print("  - image_file: Path to palette image")


def example_2_batch_processing():
    """Example 2: Process all images in a directory"""
    print("\n=== Example 2: Batch Directory Processing ===\n")
    
    # Create pipeline
    pipeline = ColorExtractionPipeline(num_colors=16, output_dir='extracted_colors')
    
    # Process directory
    # results = pipeline.process_directory(
    #     './images',
    #     identifier_prefix='sprite',
    #     image_extensions=['.png', '.jpg']
    # )
    
    print("To run: Uncomment the code below and provide a valid directory")
    print("""
pipeline = ColorExtractionPipeline(num_colors=16, output_dir='extracted_colors')
results = pipeline.process_directory(
    './images',
    identifier_prefix='sprite',
    image_extensions=['.png', '.jpg']
)
print(f'Processed {len(results)} images')
    """)


def example_3_direct_extractor():
    """Example 3: Use K-Means extractor directly"""
    print("\n=== Example 3: Direct K-Means Extractor ===\n")
    
    # Create extractor
    extractor = KMeansColorExtractor(n_clusters=8, max_iterations=100)
    
    # Extract colors
    # hex_colors, rgb_array = extractor.extract_colors('path/to/image.png')
    
    print("To run:")
    print("""
extractor = KMeansColorExtractor(n_clusters=8)
hex_colors, rgb_array = extractor.extract_colors('path/to/image.png')
print(f'Extracted {len(hex_colors)} colors: {hex_colors}')
print(f'RGB values shape: {rgb_array.shape}')
    """)


def example_4_json_update():
    """Example 4: Update palette from JSON file"""
    print("\n=== Example 4: Update Palette from JSON ===\n")
    
    generator = ColorPaletteGenerator(output_dir='extracted_colors')
    
    # Update from JSON
    # result = generator.update_from_json(
    #     'extracted_colors/metadata/image_v1_colors.json',
    #     new_identifier='image_v2'
    # )
    
    print("To run:")
    print("""
generator = ColorPaletteGenerator(output_dir='extracted_colors')
result = generator.update_from_json(
    'extracted_colors/metadata/image_v1_colors.json',
    new_identifier='image_v2'
)
print(f'Updated palette: {result}')
    """)
    print("\nThis is useful when you:")
    print("  - Edit the JSON colors manually")
    print("  - Want to regenerate the palette image with a new identifier")
    print("  - Need to version your color extractions")


def example_5_custom_workflow():
    """Example 5: Custom workflow with manual control"""
    print("\n=== Example 5: Custom Workflow ===\n")
    
    print("""
# Step 1: Extract colors from image
extractor = KMeansColorExtractor(n_clusters=16)
hex_colors, rgb_array = extractor.extract_colors('sprite.png')

# Step 2: Manually process or filter colors (optional)
# filtered_colors = [c for c in hex_colors if should_keep(c)]

# Step 3: Generate palette files
generator = ColorPaletteGenerator(output_dir='extracted_colors')
result = generator.generate_palette_files(
    'sprite.png',
    hex_colors,
    identifier='main'
)

# Step 4: Check output
print(f'JSON: {result["metadata_file"]}')
print(f'Image: {result["image_file"]}')
print(f'Colors: {result["colors"]}')

# Step 5: Later, update with new identifier
generator.update_from_json(
    result['metadata_file'],
    new_identifier='main_refined'
)
    """)


def example_6_color_utility_functions():
    """Example 6: Using color conversion utilities"""
    print("\n=== Example 6: Color Conversion Utilities ===\n")
    
    extractor = KMeansColorExtractor()
    
    print("Hex to RGB conversion:")
    rgb = extractor._hex_to_rgb("#FF0000")
    print(f"  '#FF0000' -> {rgb}")
    
    print("\nRGB to Hex conversion:")
    hex_color = extractor._rgb_to_hex((255, 0, 0))
    print(f"  (255, 0, 0) -> '{hex_color}'")
    
    print("\nBatch conversion:")
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
    hex_colors = [extractor._rgb_to_hex(c) for c in colors]
    print(f"  {colors}")
    print(f"  -> {hex_colors}")


def show_directory_structure():
    """Show the expected output directory structure"""
    print("\n=== Output Directory Structure ===\n")
    
    structure = """
extracted_colors/
├── metadata/
│   ├── sprite_main_colors.json
│   ├── sprite_main_refined_colors.json
│   ├── background_v1_colors.json
│   └── background_v2_colors.json
└── palette_images/
    ├── sprite_main_1x16.png
    ├── sprite_main_refined_1x16.png
    ├── background_v1_1x8.png
    └── background_v2_1x8.png
    """
    print(structure)
    
    print("JSON metadata file (sprite_main_colors.json):")
    print("""{
  "image_file_name": "sprite.png",
  "color_file_name": "sprite_main_colors.json",
  "identifier": "main",
  "num_colors": 16,
  "colors": [
    "#ffffff",
    "#000000",
    "#ff0000",
    ...
  ],
  "created_at": "2026-05-05T12:34:56.789012",
  "image_format": "1xN"
}""")


def main():
    """Run all examples"""
    print("\n" + "="*60)
    print("COLOR EXTRACTION SYSTEM - USAGE EXAMPLES")
    print("="*60)
    
    example_1_single_image_extraction()
    example_2_batch_processing()
    example_3_direct_extractor()
    example_4_json_update()
    example_5_custom_workflow()
    example_6_color_utility_functions()
    show_directory_structure()
    
    print("\n" + "="*60)
    print("For more information, see: README_EXTRACTOR.md")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
