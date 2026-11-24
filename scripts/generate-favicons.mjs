import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcLogo = 'src/assets/logo-vtauto.png';
const publicDir = 'public';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function createIcon(size, options = {}) {
  const { radius = 0, paddingPercent = 0.1, isSolid = false } = options;
  const inputBuffer = fs.readFileSync(srcLogo);

  // Target logo dimension inside the square
  const targetLogoWidth = Math.round(size * (1 - paddingPercent * 2));
  const logoResized = await sharp(inputBuffer)
    .resize(targetLogoWidth, null, { fit: 'inside' })
    .toBuffer();

  let baseImage;
  if (isSolid) {
    baseImage = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });
  } else if (radius > 0) {
    const svgBadge = Buffer.from(
      `<svg width="${size}" height="${size}">` +
      `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/>` +
      `</svg>`
    );
    baseImage = sharp(svgBadge);
  } else {
    baseImage = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });
  }

  return baseImage
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function generate() {
  console.log('Generating favicon and PWA icons from official logo:', srcLogo);

  // 1. Favicon 16x16 (with subtle rounded white squircle for dark/light tab contrast)
  const f16 = await createIcon(16, { radius: 3, paddingPercent: 0.05 });
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), f16);
  console.log('✓ Created public/favicon-16x16.png');

  // 2. Favicon 32x32 (with rounded white squircle)
  const f32 = await createIcon(32, { radius: 6, paddingPercent: 0.08 });
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), f32);
  console.log('✓ Created public/favicon-32x32.png');

  // 3. Favicon 48x48
  const f48 = await createIcon(48, { radius: 9, paddingPercent: 0.08 });
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), f48);
  console.log('✓ Created public/favicon-48x48.png');

  // 4. Default favicon.png (32x32)
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), f32);
  console.log('✓ Created public/favicon.png');

  // 5. Default favicon.ico (copy of 32x32 png, which all modern browsers natively parse)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), f32);
  console.log('✓ Created public/favicon.ico');

  // 6. Apple Touch Icon (180x180) - Solid white background as required by iOS
  const appleIcon = await createIcon(180, { isSolid: true, paddingPercent: 0.12 });
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
  console.log('✓ Created public/apple-touch-icon.png');

  // 7. PWA 192x192 - Solid white background for Android/PWA
  const pwa192 = await createIcon(192, { isSolid: true, paddingPercent: 0.12 });
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
  console.log('✓ Created public/pwa-192x192.png');

  // 8. PWA 512x512 - Solid white background for high-res splash/manifest
  const pwa512 = await createIcon(512, { isSolid: true, paddingPercent: 0.12 });
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
  console.log('✓ Created public/pwa-512x512.png');

  // 9. Synchronize manifests with theme color and description
  const manifestContent = {
    name: 'VT AUTO — Quản lý bãi xe',
    short_name: 'VT AUTO',
    description: 'Hệ thống quản lý gara xe và mua bán xe ô tô chuyên nghiệp VT AUTO',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1f59a8',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.webmanifest'), JSON.stringify(manifestContent, null, 2));
  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2));
  console.log('✓ Updated public/manifest.webmanifest & manifest.json');

  console.log('\nAll favicons and PWA assets generated successfully from official logo!');
}

generate().catch(err => {
  console.error('Favicon generation error:', err);
  process.exit(1);
});
