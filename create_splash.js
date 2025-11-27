const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Define splash screen sizes for different densities
const splashSizes = {
    'drawable-land-hdpi': { width: 800, height: 480 },
    'drawable-land-mdpi': { width: 480, height: 320 },
    'drawable-land-xhdpi': { width: 1280, height: 720 },
    'drawable-land-xxhdpi': { width: 1600, height: 960 },
    'drawable-land-xxxhdpi': { width: 1920, height: 1280 },
    'drawable-port-hdpi': { width: 480, height: 800 },
    'drawable-port-mdpi': { width: 320, height: 480 },
    'drawable-port-xhdpi': { width: 720, height: 1280 },
    'drawable-port-xxhdpi': { width: 960, height: 1600 },
    'drawable-port-xxxhdpi': { width: 1280, height: 1920 }
};

async function createSplashScreens() {
    const sourceSplash = '/home/simsonpeter/.gemini/antigravity/brain/5ef74591-ca2e-4528-92a4-d110a56f477d/splash_screen_1764199869678.png';

    for (const [folder, size] of Object.entries(splashSizes)) {
        const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);

        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create splash.png
        await sharp(sourceSplash)
            .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
            .toFile(path.join(outputDir, 'splash.png'));

        console.log(`Created ${folder} splash (${size.width}x${size.height})`);
    }

    console.log('All splash screens created successfully!');
}

createSplashScreens().catch(console.error);
