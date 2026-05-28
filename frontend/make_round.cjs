const sharp = require('sharp');

async function processImage() {
  const imagePath = 'public/logo.png';
  const outPath = 'public/favicon.png';
  
  const metadata = await sharp(imagePath).metadata();
  const size = Math.min(metadata.width, metadata.height);
  
  const circleSvg = Buffer.from(
    `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
  );

  await sharp(imagePath)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .composite([{
      input: circleSvg,
      blend: 'dest-in'
    }])
    .toFile(outPath);
    
  console.log('Successfully generated favicon.png');
}

processImage().catch(console.error);
