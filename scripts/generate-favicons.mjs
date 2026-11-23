import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcLogo = 'src/assets/logo-vtauto.png';
const publicDir = 'public';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  console.log('Generating favicon and PWA icons from:', srcLogo);
  const inputBuffer = fs.readFileSync(srcLogo);

  // 1. Favicon 16x16
  await sharp(inputBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ Created public/favicon-16x16.png');

  // 2. Favicon 32x32
  await sharp(inputBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created public/favicon-32x32.png');

  // 3. Favicon 48x48
  await sharp(inputBuffer)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('✓ Created public/favicon-48x48.png');

  // 4. Default favicon.png (32x32)
  await sharp(inputBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created public/favicon.png');

  // 5. Default favicon.ico (copy of 32x32 png which browsers handle natively)
  fs.copyFileSync(path.join(publicDir, 'favicon.png'), path.join(publicDir, 'favicon.ico'));
  console.log('✓ Created public/favicon.ico');

  // 6. Apple Touch Icon (180x180) with subtle padding for iOS home screen icon aesthetic
  await sharp(inputBuffer)
    .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 7. PWA 192x192
  await sharp(inputBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created public/pwa-192x192.png');

  // 8. PWA 512x512
  await sharp(inputBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created public/pwa-512x512.png');

  // 9. manifest.webmanifest and manifest.json
  const manifestContent = {
    name: 'VT AUTO — Quản lý bãi xe',
    short_name: 'VT AUTO',
    description: 'Hệ thống quản lý gara xe và mua bán xe ô tô chuyên nghiệp VT AUTO',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#034bad',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  fs.writeFileSync(path.join(publicDir, 'manifest.webmanifest'), JSON.stringify(manifestContent, null, 2));
  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2));
  console.log('✓ Created public/manifest.webmanifest & manifest.json');

  console.log('\nAll favicons and PWA assets generated successfully!');
}

generate().catch(err => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
