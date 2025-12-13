const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Define icon sizes for different densities
const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

// Foreground icons for adaptive icons (should be 108dp safe zone, so 81% of size)
const foregroundSizes = {
    'mipmap-mdpi': 39,  // 81% of 48
    'mipmap-hdpi': 58,  // 81% of 72
    'mipmap-xhdpi': 78, // 81% of 96
    'mipmap-xxhdpi': 117, // 81% of 144
    'mipmap-xxxhdpi': 156 // 81% of 192
};

async function createIcons() {
    const logoPath = path.join(__dirname, '..', 'logo.png');
    
    if (!fs.existsSync(logoPath)) {
        console.error('logo.png not found in parent directory');
        return;
    }

    // Get logo dimensions
    const metadata = await sharp(logoPath).metadata();
    console.log(`Logo dimensions: ${metadata.width}x${metadata.height}`);

    for (const [folder, size] of Object.entries(sizes)) {
        const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);

        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create ic_launcher.png with white background
        await sharp(logoPath)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
            })
            .toFile(path.join(outputDir, 'ic_launcher.png'));

        // Create ic_launcher_round.png with white background
        await sharp(logoPath)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
            })
            .toFile(path.join(outputDir, 'ic_launcher_round.png'));

        // Create ic_launcher_foreground.png for adaptive icons (transparent background)
        const foregroundSize = foregroundSizes[folder];
        await sharp(logoPath)
            .resize(foregroundSize, foregroundSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
            })
            .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));

        console.log(`Created ${folder} icons (${size}x${size}) with foreground (${foregroundSize}x${foregroundSize})`);
    }

    console.log('All icons created successfully!');
}

createIcons().catch(console.error);












