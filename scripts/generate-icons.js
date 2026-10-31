import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size / 2;

  // Colors
  const bgR = 15, bgG = 56, bgB = 42; // #0F382A
  const darkR = 9, darkG = 34, darkB = 25; // #092219
  const goldR = 197, goldG = 155, goldB = 39; // #C59B27
  const goldLightR = 243, goldLightG = 220, goldLightB = 125; // #F3DC7D
  const whiteR = 247, whiteG = 245, whiteB = 238; // #F7F5EE
  const shieldR = 19, shieldG = 71, shieldB = 52; // #134734

  // Scaling factor for content inside maskable vs standard
  // Maskable icons need 15% safe zone padding
  const scale = isMaskable ? 0.72 : 0.88;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      
      // Calculate normalized coordinates (-1 to 1) relative to center
      const nx = (x - center) / (center * scale);
      const ny = (y - center) / (center * scale);
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Base background
      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = 255;

      // Vertical gradient on background
      const gradT = y / size;
      r = Math.round(bgR * (1 - gradT * 0.4) + darkR * (gradT * 0.4));
      g = Math.round(bgG * (1 - gradT * 0.4) + darkG * (gradT * 0.4));
      b = Math.round(bgB * (1 - gradT * 0.4) + darkB * (gradT * 0.4));

      // Shield geometry: top flat with bevel, bottom pointed
      const inShieldX = Math.abs(nx) < 0.62;
      const inShieldTop = ny > -0.65 && ny < 0.05;
      const inShieldBottom = ny >= 0.05 && (Math.abs(nx) < 0.62 - (ny - 0.05) * 0.85);

      if (inShieldX && (inShieldTop || inShieldBottom)) {
        // Shield fill
        r = shieldR;
        g = shieldG;
        b = shieldB;

        // Shield border
        const isBorder = Math.abs(nx) > 0.53 || ny < -0.58 || (ny >= 0.05 && Math.abs(nx) > 0.62 - (ny - 0.05) * 0.85 - 0.09);
        if (isBorder) {
          r = goldR;
          g = goldG;
          b = goldB;
        }

        // Inner emblem: Golden coin in center
        const coinDist = Math.sqrt(nx * nx + (ny - 0.12) * (ny - 0.12));
        if (coinDist < 0.28) {
          // Gold coin
          r = goldLightR;
          g = goldLightG;
          b = goldLightB;

          // Inner emblem 'C'
          const cDist = Math.sqrt(nx * nx + (ny - 0.12) * (ny - 0.12));
          if (cDist < 0.18 && cDist > 0.10 && !(nx > 0.05 && Math.abs(ny - 0.12) < 0.08)) {
            r = bgR;
            g = bgG;
            b = bgB;
          }
        }

        // Star / Sparkle above coin
        const starDist = Math.abs(nx) + Math.abs(ny + 0.35);
        if (starDist < 0.14) {
          r = goldLightR;
          g = goldLightG;
          b = goldLightB;
        }
      }

      // Outer decorative subtle ring
      if (dist > 0.88 && dist < 0.92) {
        r = Math.round(r * 0.6 + goldR * 0.4);
        g = Math.round(g * 0.6 + goldG * 0.4);
        b = Math.round(b * 0.6 + goldB * 0.4);
      }

      // For non-maskable icons, round the corners slightly if needed
      if (!isMaskable) {
        const cornerDist = Math.hypot(Math.max(0, Math.abs(x - center) - (size * 0.4)), Math.max(0, Math.abs(y - center) - (size * 0.4)));
        if (cornerDist > size * 0.1) {
          a = 0;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

// Generate all standard PWA assets
console.log('Generating PWA icons...');

const icon192 = createIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable512 = createIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable512);

const appleTouchIcon = createIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

// Favicon 64x64 PNG copied as favicon.ico
const favicon = createIcon(64, false);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

console.log('PWA icons generated successfully in /public');
