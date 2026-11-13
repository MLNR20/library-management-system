import * as THREE from 'three';

const SIZE = 512;
/** Quarry tiles along each side of one tile of the texture. The texture covers TILE_WORLD_SIZE units of floor, so a quarry tile is half a unit square. */
const TILES = 8;
export const TILE_WORLD_SIZE = 4;
const GROUT = 3;

// Tiny seeded random generator, so the floor looks the same every time (Math.random would change on each load).
function seededRandom(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Paints a tileable floor of red quarry tiles, like a grand reading room's: square terracotta tiles laid in a straight
 * grid, each fired a slightly different red or orange, a little worn towards the middle and darker at its edges, with
 * fine specks in the clay and pale grout between them.
 */
export function createFloorTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const random = seededRandom(31);
    const side = SIZE / TILES;

    // The grout shows wherever no tile is painted.
    ctx.fillStyle = '#c9b79c';
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (let row = 0; row < TILES; row++) {
        for (let column = 0; column < TILES; column++) {
            const left = column * side + GROUT / 2;
            const top = row * side + GROUT / 2;
            const size = side - GROUT;
            const hue = 12 + random() * 9;
            const saturation = 56 + random() * 10;
            const lightness = 40 + random() * 9;

            ctx.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
            ctx.fillRect(left, top, size, size);

            // Worn paler in the middle, darker round the edges.
            const centreX = left + size / 2;
            const centreY = top + size / 2;
            const wear = ctx.createRadialGradient(centreX, centreY, size * 0.1, centreX, centreY, size * 0.75);
            wear.addColorStop(0, `hsl(${hue + 4} ${saturation}% ${lightness + 7}% / 0.5)`);
            wear.addColorStop(1, `hsl(${hue - 3} ${saturation}% ${lightness - 12}% / 0.55)`);
            ctx.fillStyle = wear;
            ctx.fillRect(left, top, size, size);

            // Specks in the fired clay.
            for (let i = 0; i < 26; i++) {
                const dark = random() < 0.6;
                ctx.fillStyle = dark ? `rgba(70, 28, 14, ${0.08 + random() * 0.14})` : `rgba(255, 214, 170, ${0.08 + random() * 0.12})`;
                ctx.fillRect(left + random() * (size - 3), top + random() * (size - 3), 1 + random() * 2.5, 1 + random() * 2);
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}
