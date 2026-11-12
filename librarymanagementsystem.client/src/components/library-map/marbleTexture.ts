import * as THREE from 'three';

const SIZE = 512;

// Tiny seeded random generator, so the marble looks the same every time (Math.random would change on each load).
function seededRandom(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Smooth random values on a grid of `cells` by `cells` that wraps round, so the texture tiles without seams. */
function periodicNoise(random: () => number, cells: number) {
    const grid = Float32Array.from({ length: cells * cells }, () => random());
    const at = (i: number, j: number) => grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
    const ease = (t: number) => t * t * (3 - 2 * t);
    return (u: number, v: number) => {
        const x = u * cells;
        const y = v * cells;
        const i = Math.floor(x);
        const j = Math.floor(y);
        const fx = ease(x - i);
        const fy = ease(y - j);
        const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
        const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
        return top + (bottom - top) * fy;
    };
}

/** Several layers of noise, each twice as fine and half as strong as the last: the swirl that bends the veins. */
function turbulence(random: () => number, baseCells: number, octaves: number) {
    const layers = Array.from({ length: octaves }, (_, k) => periodicNoise(random, baseCells * 2 ** k));
    return (u: number, v: number) => layers.reduce((sum, layer, k) => sum + layer(u, v) / 2 ** k, 0) / 1.9;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

/**
 * Paints tileable white marble, like Carrara: a warm white ground with soft grey clouding, bold grey veins running on
 * the diagonal and bent by turbulence, and a web of fainter, finer veins between them.
 */
export function createMarbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const random = seededRandom(11);
    const swirl = turbulence(random, 4, 4);
    const fineSwirl = turbulence(random, 8, 3);
    const cloud = turbulence(random, 4, 3);
    const image = ctx.createImageData(SIZE, SIZE);

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const u = x / SIZE;
            const v = y / SIZE;
            // Whole numbers of waves across the tile keep its edges matching.
            const main = Math.abs(Math.sin(Math.PI * 2 * (2 * u + v) + swirl(u, v) * 9));
            const fine = Math.abs(Math.sin(Math.PI * 2 * (5 * u - 3 * v) + fineSwirl(u, v) * 14));
            const vein = 1 - smoothstep(0, 0.1, main);
            const thread = 1 - smoothstep(0, 0.05, fine);
            const shade = (cloud(u, v) - 0.5) * 22;

            const mix = (base: number, veinTone: number, threadTone: number) =>
                base - shade + (veinTone - base) * vein * 0.72 + (threadTone - base) * thread * 0.35 * (1 - vein);
            const p = (y * SIZE + x) * 4;
            image.data[p] = mix(244, 118, 160);
            image.data[p + 1] = mix(241, 121, 162);
            image.data[p + 2] = mix(235, 128, 168);
            image.data[p + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}
