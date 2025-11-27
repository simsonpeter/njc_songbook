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

async function createIcons() {
    // Get logo dimensions
    const metadata = await sharp('logo.png').metadata();
    console.log(`Logo dimensions: ${metadata.width}x${metadata.height}`);

    for (const [folder, size] of Object.entries(sizes)) {
        const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);

        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create ic_launcher.png with contain fit (adds padding to maintain aspect ratio)
        await sharp('logo.png')
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
            })
            .toFile(path.join(outputDir, 'ic_launcher.png'));

        // Create ic_launcher_round.png with contain fit
        await sharp('logo.png')
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
            })
            .toFile(path.join(outputDir, 'ic_launcher_round.png'));

        console.log(`Created ${folder} icons (${size}x${size})`);
    }

    console.log('All icons created successfully!');
}

createIcons().catch(console.error);
