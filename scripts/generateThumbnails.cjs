/**
 * Batch resize existing vehicle images to create thumbnails.
 *
 * Run: node scripts/generateThumbnails.js
 *
 * Scans all vehicle_images where thumbnail IS NULL,
 * downloads the original, resizes to 600px width (75% quality),
 * uploads the thumbnail to the same bucket, and updates the DB record.
 */
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = 'https://obhamybvdpgremtofvvb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaGFteWJ2ZHBncmVtdG9mdnZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE2MDM3MywiZXhwIjoyMDk4NzM2MzczfQ.DpPnOtYkFswYqzd4JrYMfKNM6WmdH5yM1QhDk8sMc5c';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractPath(url) {
  const u = new URL(url);
  const match = u.pathname.match(/\/object\/public\/vehicle-images\/(.+)$/);
  return match ? match[1] : null;
}

async function uploadThumbnail(path, buffer) {
  const { data, error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(path);
  return urlData.publicUrl;
}

async function run() {
  console.log('Fetching images without thumbnails...');
  const { data: images, error } = await supabase
    .from('vehicle_images')
    .select('id, url, path')
    .is('thumbnail', null)
    .order('created_at', { ascending: false });

  if (error) { console.error('Query failed:', error.message); return; }
  if (!images || images.length === 0) { console.log('All images already have thumbnails!'); return; }

  console.log(`Found ${images.length} images to process.\n`);

  let done = 0, failed = 0;

  for (const img of images) {
    const origPath = img.path;
    // Derive thumbnail path: insert _thumb before the extension
    const dot = origPath.lastIndexOf('.');
    const thumbPath = dot === -1 ? origPath + '_thumb.jpg' : origPath.slice(0, dot) + '_thumb.jpg';

    // Skip if thumb already exists in storage (check by trying to get it)
    try {
      const { data: existing } = await supabase.storage
        .from('vehicle-images')
        .list(thumbPath.substring(0, thumbPath.lastIndexOf('/')), { search: thumbPath.split('/').pop() });
      if (existing && existing.length > 0) {
        console.log(`  SKIP ${img.id} — thumbnail already exists in storage`);
        // Update DB record with the thumbnail URL
        const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(thumbPath);
        await supabase.from('vehicle_images').update({ thumbnail: urlData.publicUrl }).eq('id', img.id);
        done++;
        continue;
      }
    } catch {}

    try {
      console.log(`  Processing ${img.id}...`);
      const origBuffer = await download(img.url);
      const origSize = (origBuffer.length / 1024).toFixed(0);
      console.log(`    Downloaded: ${origSize}KB`);

      const thumbBuffer = await sharp(origBuffer)
        .resize(600, undefined, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();

      const thumbUrl = await uploadThumbnail(thumbPath, thumbBuffer);
      const thumbSize = (thumbBuffer.length / 1024).toFixed(0);

      await supabase.from('vehicle_images').update({ thumbnail: thumbUrl }).eq('id', img.id);

      console.log(`    Thumbnail: ${thumbSize}KB (${((thumbBuffer.length / origBuffer.length) * 100).toFixed(1)}% of original)`);
      done++;
    } catch (err) {
      console.error(`    FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${done} succeeded, ${failed} failed, ${images.length - done - failed} skipped.`);
}

run().catch(console.error);