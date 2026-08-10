const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer generator
function createPng(width, height) {
  // Simple PNG encoder for solid/gradient background with emblem
  const numChannels = 4;
  const rawData = Buffer.alloc(height * (1 + width * numChannels));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * numChannels);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * numChannels;

      // Radial gradient background (#121216 to #0a0a0c) with crimson glow (#dc143c)
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const maxDist = width * 0.7;
      const factor = Math.min(dist / maxDist, 1);

      // Draw cross emblem in center
      const relX = (x - cx) / width;
      const relY = (y - cy) / height;

      // Vertical beam of cross
      const isVertBeam = Math.abs(relX) < 0.06 && relY > -0.35 && relY < 0.35;
      // Horizontal beam of cross
      const isHorizBeam = Math.abs(relY + 0.1) < 0.06 && Math.abs(relX) < 0.28;
      // Glow ring around center
      const ringDist = Math.abs(dist - width * 0.36);
      const isRing = ringDist < width * 0.02;

      let r, g, b, a = 255;

      if (isVertBeam || isHorizBeam) {
        // Gold/Crimson highlight cross
        r = 245; g = 245; b = 250;
      } else if (isRing) {
        // Crimson glowing ring
        r = 220; g = 20; b = 60;
      } else if (dist < width * 0.36) {
        // Inner crimson aura
        const aura = 1 - (dist / (width * 0.36));
        r = Math.round(18 + 180 * aura);
        g = Math.round(10 + 20 * aura);
        b = Math.round(15 + 40 * aura);
      } else {
        // Background dark gradient
        r = Math.round(20 * (1 - factor) + 10 * factor);
        g = Math.round(20 * (1 - factor) + 10 * factor);
        b = Math.round(26 * (1 - factor) + 12 * factor);
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);

  const crc32 = calcCrc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc32, 8 + len);
  return buf;
}

function calcCrc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PNG icons...');
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180));
console.log('PNG icons created successfully!');
