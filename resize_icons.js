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
    for (const [folder, size] of Object.entries(sizes)) {
        const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);

        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create ic_launcher.png
        await sharp('logo.png')
            .resize(size, size)
            .toFile(path.join(outputDir, 'ic_launcher.png'));

        // Create ic_launcher_round.png
        await sharp('logo.png')
            .resize(size, size)
            .toFile(path.join(outputDir, 'ic_launcher_round.png'));

        console.log(`Created ${folder} icons (${size}x${size})`);
    }

    console.log('All icons created successfully!');
}

createIcons().catch(console.error);
