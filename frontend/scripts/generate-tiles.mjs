/*
 * Generates the Leaflet tile pyramid for the Middle-earth map.
 *
 * The map is drawn with CRS.Simple over bounds [[0, 0], [MAP_Y, MAP_X]], so at
 * Leaflet zoom 0 one map unit is one pixel and the map is MAP_X x MAP_Y. Every
 * level below that is a halving. The master image is a different size to the
 * bounds, so level 0 resizes it into the bounds space -- that is what keeps the
 * marker coordinates in New_MapData.json aligned.
 *
 * CRS.Simple maps lat -> -pixelY, which anchors the tile grid to lat 0 (the
 * bottom edge of the map) and leaves the top row of tiles partly empty. Padding
 * the level at the top, not the bottom, reproduces that alignment, and lets
 * every tile be a clean 256x256 extract.
 *
 * Tiles are committed, so this only needs re-running if the master image or the
 * MAP_X / MAP_Y bounds change. Output goes to src/public/tiles, which vite
 * copies into dist as-is:
 *
 *     npm install --no-save sharp
 *     node scripts/generate-tiles.mjs
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

let sharp;

try {
    sharp = (await import('sharp')).default;
} catch {
    console.error('This script needs sharp: npm install --no-save sharp');
    process.exit(1);
}

// Must match MAP_X / MAP_Y in src/lib/constants.ts
const MAP_X = 8000;
const MAP_Y = 5656;

const TILE_SIZE = 256;
const MIN_ZOOM = -6;
const MAX_ZOOM = 0;
// Leaflet zoom is negative here, which makes for awkward directory names, so
// the tile path is offset by this. Must match ZOOM_OFFSET in src/lib/constants.ts
const ZOOM_OFFSET = 6;

const SOURCE = path.resolve('assets-src/MiddleEarthBlanco.webp');
const OUT_DIR = path.resolve('src/public/tiles');

const level = zoom => {
    const scale = 2 ** zoom;
    const width = Math.round(MAP_X * scale);
    const height = Math.round(MAP_Y * scale);

    return {
        zoom,
        width,
        height,
        cols: Math.ceil(width / TILE_SIZE),
        rows: Math.ceil(height / TILE_SIZE),
    };
};

const levels = [];

for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
    levels.push(level(zoom));
}

await rm(OUT_DIR, { recursive: true, force: true });

let written = 0;
let bytes = 0;

for (const { zoom, width, height, cols, rows } of levels) {
    const dir = zoom + ZOOM_OFFSET;
    const paddedWidth = cols * TILE_SIZE;
    const paddedHeight = rows * TILE_SIZE;

    // One decode per level. Padding goes on the top and right so that tile
    // (0, 0) in TMS terms is flush with the bottom-left of the map.
    const raw = await sharp(SOURCE)
        .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
        .ensureAlpha()
        .extend({
            top: paddedHeight - height,
            right: paddedWidth - width,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .raw()
        .toBuffer();

    const source = { raw: { width: paddedWidth, height: paddedHeight, channels: 4 } };

    for (let col = 0; col < cols; col++) {
        await mkdir(path.join(OUT_DIR, String(dir), String(col)), { recursive: true });

        for (let row = 0; row < rows; row++) {
            const tile = await sharp(raw, source)
                .extract({
                    left: col * TILE_SIZE,
                    // row is measured from the bottom, the image from the top
                    top: (rows - 1 - row) * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                })
                .webp({ quality: 80, effort: 5 })
                .toBuffer();

            await writeFile(path.join(OUT_DIR, String(dir), String(col), `${row}.webp`), tile);

            written++;
            bytes += tile.length;
        }
    }

    console.log(`zoom ${String(zoom).padStart(2)} -> tiles/${dir}  ${width}x${height}  ${cols}x${rows} tiles`);
}

console.log(`\n${written} tiles, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
