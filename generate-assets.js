import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('Starting custom high-quality asset generation...');

  const logoPath = 'logo.jpg';
  if (!fs.existsSync(logoPath)) {
    console.error(`Error: Source logo file not found at ${logoPath}`);
    process.exit(1);
  }

  // Load the source logo
  const logo = await Jimp.read(logoPath);
  console.log(`Loaded source logo: ${logo.width}x${logo.height}`);

  // Ensure assets directory exists
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
  }

  // 1. Generate icon.png (1024x1024)
  const icon = logo.clone();
  icon.resize({ w: 1024, h: 1024 });
  await icon.write('assets/icon.png');
  await icon.write('icon.png');
  
  // Write to local web directories to fix corruption and ensure they match perfectly
  await icon.write('public/logo.png');
  await icon.write('src/assets/logo.png');
  await icon.write('public/logo.jpg');
  await icon.write('src/assets/logo.jpg');
  
  console.log('Generated: assets/icon.png, icon.png, public/logo.png, src/assets/logo.png, public/logo.jpg, src/assets/logo.jpg');

  // 2. Generate icon-only.png (1024x1024)
  const iconOnly = logo.clone();
  iconOnly.resize({ w: 1024, h: 1024 });
  await iconOnly.write('assets/icon-only.png');
  console.log('Generated: assets/icon-only.png');

  // 3. Generate icon-foreground.png (1024x1024) - Adaptive Icon Foreground (centered safe zone)
  const foreground = new Jimp({ width: 1024, height: 1024, color: 0x00000000 }); // Transparent
  const resizedLogoForAdaptive = logo.clone();
  resizedLogoForAdaptive.resize({ w: 680, h: 680 }); // Centered within 1024x1024
  foreground.composite(resizedLogoForAdaptive, 172, 172); // Center: (1024 - 680) / 2 = 172
  await foreground.write('assets/icon-foreground.png');
  console.log('Generated: assets/icon-foreground.png');

  // 4. Generate icon-background.png (1024x1024) - Adaptive Icon Background
  // We will use solid white as standard for adaptive icon backgrounds
  const background = new Jimp({ width: 1024, height: 1024, color: 0xffffffff });
  await background.write('assets/icon-background.png');
  console.log('Generated: assets/icon-background.png');

  // 5. Generate splash.png (2732x2732) - Light Splash Screen
  const splashLight = new Jimp({ width: 2732, height: 2732, color: 0xffffffff }); // White background
  const splashLogoLight = logo.clone();
  splashLogoLight.resize({ w: 800, h: 800 }); // Center resize
  splashLight.composite(splashLogoLight, 966, 966); // Center: (2732 - 800) / 2 = 966
  await splashLight.write('assets/splash.png');
  console.log('Generated: assets/splash.png');

  // 6. Generate splash-dark.png (2732x2732) - Dark Splash Screen
  const splashDark = new Jimp({ width: 2732, height: 2732, color: 0x1e293bff }); // Slate 800 background
  const splashLogoDark = logo.clone();
  splashLogoDark.resize({ w: 800, h: 800 });
  splashDark.composite(splashLogoDark, 966, 966);
  await splashDark.write('assets/splash-dark.png');
  console.log('Generated: assets/splash-dark.png');

  console.log('Custom asset generation completed successfully!');
}

generate().catch(err => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
