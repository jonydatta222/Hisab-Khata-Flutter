import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

// Helper to write files atomically (writes to .tmp first then renames atomically)
// This guarantees that browsers or build tools never read a half-written or corrupted image.
async function writeAtomic(image, targetPath) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const ext = path.extname(targetPath);
  const tempPath = targetPath.slice(0, -ext.length) + '.tmp' + ext;
  await image.write(tempPath);
  try {
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    // Fallback if cross-device link error occurs (unlikely here but good practice)
    fs.copyFileSync(tempPath, targetPath);
    fs.unlinkSync(tempPath);
  }
}

async function generate() {
  console.log('Starting custom high-quality asset generation...');

  let logoPath = null;
  // Order of priority: Check root first, then backup directory
  const possiblePaths = [
    'logo.png',
    'logo.jpg',
    'original-logo-upload/logo.png',
    'original-logo-upload/logo.jpg'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      logoPath = p;
      break;
    }
  }

  if (!logoPath) {
    console.error(`Error: Source logo file not found! Checked: logo.png, logo.jpg, original-logo-upload/logo.png, original-logo-upload/logo.jpg`);
    process.exit(1);
  }

  console.log(`Using source logo: ${logoPath}`);

  // Auto-sync: If logo is uploaded to the root directory, sync it to original-logo-upload backup
  if (logoPath === 'logo.png' || logoPath === 'logo.jpg') {
    if (!fs.existsSync('original-logo-upload')) {
      fs.mkdirSync('original-logo-upload', { recursive: true });
    }
    const ext = path.extname(logoPath);
    const backupDest = `original-logo-upload/logo${ext}`;
    try {
      fs.copyFileSync(logoPath, backupDest);
      console.log(`Successfully backed up root ${logoPath} to ${backupDest}`);
    } catch (err) {
      console.warn(`Warning: Could not sync ${logoPath} to backup folder:`, err);
    }
  }

  // Load the source logo
  const logo = await Jimp.read(logoPath);
  console.log(`Loaded source logo: ${logo.width}x${logo.height} from ${logoPath}`);

  // Ensure assets directory exists
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
  }

  // Ensure src/assets directory exists
  if (!fs.existsSync('src/assets')) {
    fs.mkdirSync('src/assets', { recursive: true });
  }

  // 1. Generate icon.png (1024x1024)
  const icon = logo.clone();
  icon.resize({ w: 1024, h: 1024 });
  await writeAtomic(icon, 'assets/icon.png');
  // Do not write to root 'icon.png' to avoid confusing the IDE file watcher
  
  // Create a separate web-optimized logo (256x256) to prevent asset bloating and load instantly in the app
  const webLogoPng = logo.clone();
  webLogoPng.resize({ w: 256, h: 256 });
  await writeAtomic(webLogoPng, 'public/logo.png');
  await writeAtomic(webLogoPng, 'src/assets/logo.png');
  // Do not overwrite root 'logo.png' source file to keep it intact and uncorrupted

  const webLogoJpg = logo.clone();
  webLogoJpg.resize({ w: 256, h: 256 });
  await writeAtomic(webLogoJpg, 'public/logo.jpg');
  await writeAtomic(webLogoJpg, 'src/assets/logo.jpg');
  // Do not overwrite root 'logo.jpg' source file to keep it intact and uncorrupted
  
  console.log('Generated logos in root, public, and src/assets directories');

  // 2. Generate icon-only.png (1024x1024)
  const iconOnly = logo.clone();
  iconOnly.resize({ w: 1024, h: 1024 });
  await writeAtomic(iconOnly, 'assets/icon-only.png');
  console.log('Generated: assets/icon-only.png');

  // 3. Generate icon-foreground.png (1024x1024) - Adaptive Icon Foreground (centered safe zone)
  const foreground = new Jimp({ width: 1024, height: 1024, color: 0x00000000 }); // Transparent
  const resizedLogoForAdaptive = logo.clone();
  resizedLogoForAdaptive.resize({ w: 680, h: 680 }); // Centered within 1024x1024
  foreground.composite(resizedLogoForAdaptive, 172, 172); // Center: (1024 - 680) / 2 = 172
  await writeAtomic(foreground, 'assets/icon-foreground.png');
  console.log('Generated: assets/icon-foreground.png');

  // 4. Generate icon-background.png (1024x1024) - Adaptive Icon Background
  // Sample color near the corner of the original logo to match background color
  const sampleX = Math.max(5, Math.floor(logo.width * 0.02));
  const sampleY = Math.max(5, Math.floor(logo.height * 0.02));
  const cornerPixel = logo.getPixelColor(sampleX, sampleY);
  
  // Extract channels
  const r = (cornerPixel >> 24) & 0xff;
  const g = (cornerPixel >> 16) & 0xff;
  const b = (cornerPixel >> 8) & 0xff;
  const a = cornerPixel & 0xff;
  
  // Determine final HEX color and Jimp color
  // If alpha is high (> 200), we use the sampled color, otherwise fallback to dark slate 
  const hexColor = (a > 200)
    ? `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    : '#0a101c';
    
  const finalJimpColor = (a > 200)
    ? ((r << 24) >>> 0) | (g << 16) | (b << 8) | 0xff
    : 0x0a101cff;

  const background = new Jimp({ width: 1024, height: 1024, color: finalJimpColor });
  await writeAtomic(background, 'assets/icon-background.png');
  console.log(`Generated: assets/icon-background.png with background color ${hexColor}`);

  // Auto-update android/app/src/main/res/values/ic_launcher_background.xml
  const xmlPath = 'android/app/src/main/res/values/ic_launcher_background.xml';
  if (fs.existsSync(xmlPath)) {
    try {
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${hexColor.toUpperCase()}</color>
</resources>`;
      fs.writeFileSync(xmlPath, xmlContent, 'utf8');
      console.log(`Updated ${xmlPath} with background color ${hexColor.toUpperCase()}`);
    } catch (err) {
      console.warn('Warning: Could not update native launcher background XML:', err);
    }
  }

  // 5. Generate splash.png (2732x2732) - Light Splash Screen
  const splashLight = new Jimp({ width: 2732, height: 2732, color: 0xffffffff }); // White background
  const splashLogoLight = logo.clone();
  splashLogoLight.resize({ w: 800, h: 800 }); // Center resize
  splashLight.composite(splashLogoLight, 966, 966); // Center: (2732 - 800) / 2 = 966
  await writeAtomic(splashLight, 'assets/splash.png');
  console.log('Generated: assets/splash.png');

  // 6. Generate splash-dark.png (2732x2732) - Dark Splash Screen
  const splashDark = new Jimp({ width: 2732, height: 2732, color: 0x1e293bff }); // Slate 800 background
  const splashLogoDark = logo.clone();
  splashLogoDark.resize({ w: 800, h: 800 });
  splashDark.composite(splashLogoDark, 966, 966);
  await writeAtomic(splashDark, 'assets/splash-dark.png');
  console.log('Generated: assets/splash-dark.png');

  console.log('Custom asset generation completed successfully!');
}

generate().catch(err => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
