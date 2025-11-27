#!/usr/bin/env python3
from PIL import Image
import os

# Define icon sizes for different densities
sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

# Load the original logo
logo = Image.open('logo.png')

# Create resized icons for each density
for folder, size in sizes.items():
    # Resize the image
    resized = logo.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save as ic_launcher.png
    output_path = f'android/app/src/main/res/{folder}/ic_launcher.png'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    resized.save(output_path, 'PNG')
    
    # Save as ic_launcher_round.png
    output_path_round = f'android/app/src/main/res/{folder}/ic_launcher_round.png'
    resized.save(output_path_round, 'PNG')
    
    print(f'Created {folder} icons ({size}x{size})')

print('All icons created successfully!')
