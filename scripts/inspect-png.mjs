import sharp from 'sharp';

async function inspect() {
  const file = 'src/assets/logo-vtauto.png';
  const metadata = await sharp(file).metadata();
  console.log('Metadata:', JSON.stringify(metadata, (k, v) => (k === 'xmp' || k === 'xmpAsString') ? undefined : v, 2));

  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  console.log(`Dimensions: ${info.width}x${info.height}, channels: ${info.channels}`);

  let a0 = 0;
  let aSemi = 0;
  let a255 = 0;
  let pureWhite = 0;
  let nearWhite = 0; // r,g,b >= 240
  let darkBlue = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = info.channels === 4 ? data[i+3] : 255;

    if (a === 0) a0++;
    else if (a < 255) aSemi++;
    else a255++;

    if (r === 255 && g === 255 && b === 255) pureWhite++;
    else if (r >= 240 && g >= 240 && b >= 240) nearWhite++;

    // Check dark blue of logo: r < 50, g < 60, b < 100
    if (r < 50 && g < 60 && b < 100) darkBlue++;
  }

  const total = info.width * info.height;
  console.log(`Total pixels: ${total}`);
  console.log(`Alpha = 0: ${a0} (${((a0/total)*100).toFixed(2)}%)`);
  console.log(`Alpha 1..254: ${aSemi} (${((aSemi/total)*100).toFixed(2)}%)`);
  console.log(`Alpha = 255: ${a255} (${((a255/total)*100).toFixed(2)}%)`);
  console.log(`Pure White (255,255,255): ${pureWhite} (${((pureWhite/total)*100).toFixed(2)}%)`);
  console.log(`Near White (>=240,>=240,>=240): ${nearWhite} (${((nearWhite/total)*100).toFixed(2)}%)`);
  console.log(`Dark blue logo pixels: ${darkBlue} (${((darkBlue/total)*100).toFixed(2)}%)`);

  // Corners
  const getPixel = (x, y) => {
    const idx = (y * info.width + x) * info.channels;
    return [data[idx], data[idx+1], data[idx+2], info.channels === 4 ? data[idx+3] : 255];
  };

  console.log('Top-Left (0,0):', getPixel(0, 0));
  console.log('Top-Right (w-1,0):', getPixel(info.width-1, 0));
  console.log('Bottom-Left (0,h-1):', getPixel(0, info.height-1));
  console.log('Bottom-Right (w-1,h-1):', getPixel(info.width-1, info.height-1));
}

inspect().catch(console.error);
