import * as THREE from 'three';

const SIZE = 512;
/** Planks stacked across one tile. The tile covers TILE_WORLD_SIZE units of floor. */
const PLANKS = 8;
export const TILE_WORLD_SIZE = 4;

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
 * Paints a tileable wooden floor: horizontal planks, each a slightly different brown,
 * with wavy grain lines, the odd knot, and dark seams between planks.
 */
export function createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const random = seededRandom(7);
    const plankHeight = SIZE / PLANKS;

    for (let plank = 0; plank < PLANKS; plank++) {
        const top = plank * plankHeight;
        const hue = 26 + random() * 8;
        const lightness = 36 + random() * 12;

        ctx.fillStyle = `hsl(${hue} 48% ${lightness}%)`;
        ctx.fillRect(0, top, SIZE, plankHeight);

        // Grain: thin wavy lines. A whole number of waves per tile keeps the left and right edges lined up.
        for (let line = 0; line < 22; line++) {
            const y = top + random() * plankHeight;
            const amplitude = 0.6 + random() * 1.8;
            const waves = 2 + Math.floor(random() * 4);
            const phase = random() * Math.PI * 2;
            ctx.strokeStyle = `hsl(${hue} 40% ${lightness - 8 - random() * 10}% / ${0.1 + random() * 0.2})`;
            ctx.lineWidth = 0.5 + random() * 1.2;
            ctx.beginPath();
            for (let x = 0; x <= SIZE; x += 8) {
                const wave = y + Math.sin((x / SIZE) * Math.PI * 2 * waves + phase) * amplitude;
                if (x === 0) ctx.moveTo(x, wave);
                else ctx.lineTo(x, wave);
            }
            ctx.stroke();
        }

        // An occasional knot: a dark oval that fades out at the edges.
        if (random() < 0.5) {
            const knotX = random() * SIZE;
            const knotY = top + plankHeight / 2;
            const gradient = ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, plankHeight * 0.45);
            gradient.addColorStop(0, `hsl(${hue} 50% ${lightness - 20}% / 0.85)`);
            gradient.addColorStop(1, `hsl(${hue} 50% ${lightness - 20}% / 0)`);
            ctx.save();
            ctx.translate(knotX, knotY);
            ctx.scale(1.8, 1);
            ctx.translate(-knotX, -knotY);
            ctx.fillStyle = gradient;
            ctx.fillRect(knotX - plankHeight, top, plankHeight * 2, plankHeight);
            ctx.restore();
        }

        // Dark seam under the plank, plus one short joint where two boards meet end to end.
        ctx.fillStyle = 'rgba(28, 15, 6, 0.6)';
        ctx.fillRect(0, top, SIZE, 1.5);
        ctx.fillRect(random() * SIZE, top, 1.5, plankHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}
