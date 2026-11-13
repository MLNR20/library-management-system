import * as THREE from 'three';

/** Blocks along one tile and courses up it. */
const BLOCKS = 4;
const COURSES = 4;
/** Size of one block of stone on the wall. */
const BLOCK_LENGTH = 1.5;
const COURSE_HEIGHT = 0.6;
/** The stretch of wall one tile covers. */
export const STONE_TILE_WIDTH = BLOCKS * BLOCK_LENGTH;
export const STONE_TILE_HEIGHT = COURSES * COURSE_HEIGHT;

const WIDTH = 1024;
const HEIGHT = 512;
const JOINT = 3;

// Tiny seeded random generator, so the stone looks the same every time (Math.random would change on each load).
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
 * Paints tileable limestone ashlar: big dressed blocks in level courses, every other course shifted half a block, each
 * block a slightly different warm cream and a touch darker towards its foot, with fine flecks of grain and a dark joint
 * round it that catches the light on its lower edge.
 */
export function createStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d')!;
    const random = seededRandom(23);
    const blockWidth = WIDTH / BLOCKS;
    const courseHeight = HEIGHT / COURSES;
    // Left edge of every block of a course; the block that crosses the edge of the tile is listed at both ends, so the tile wraps.
    const lefts = (course: number) => {
        const shift = course % 2 ? -blockWidth / 2 : 0;
        return Array.from({ length: BLOCKS }, (_, block) => shift + block * blockWidth);
    };

    for (let course = 0; course < COURSES; course++) {
        const top = course * courseHeight;
        for (const left of lefts(course)) {
            const hue = 35 + random() * 6;
            const lightness = 71 + random() * 7;
            const shade = ctx.createLinearGradient(0, top, 0, top + courseHeight);
            shade.addColorStop(0, `hsl(${hue} 34% ${lightness + 1.5}%)`);
            shade.addColorStop(1, `hsl(${hue} 34% ${lightness - 2}%)`);
            ctx.fillStyle = shade;
            for (const x of [left, left + WIDTH]) ctx.fillRect(x, top, blockWidth, courseHeight);
        }
    }

    // The grain of the stone: fine light and dark flecks.
    for (let i = 0; i < 9000; i++) {
        const light = random() < 0.5;
        const alpha = 0.03 + random() * 0.07;
        ctx.fillStyle = light ? `rgba(255, 250, 235, ${alpha})` : `rgba(96, 74, 42, ${alpha})`;
        ctx.fillRect(random() * WIDTH, random() * HEIGHT, 1 + random() * 2.5, 1 + random() * 1.5);
    }

    // The joints: a dark line above and to the left of every block, with a pale edge beside it where the next block's arris catches the light.
    for (let course = 0; course < COURSES; course++) {
        const top = course * courseHeight;
        ctx.fillStyle = 'rgba(86, 68, 42, 0.6)';
        ctx.fillRect(0, top, WIDTH, JOINT);
        for (const left of lefts(course)) ctx.fillRect((left + WIDTH) % WIDTH, top, JOINT, courseHeight);
        ctx.fillStyle = 'rgba(255, 249, 232, 0.4)';
        ctx.fillRect(0, top + JOINT, WIDTH, 1.5);
        for (const left of lefts(course)) ctx.fillRect(((left + WIDTH) % WIDTH) + JOINT, top + JOINT, 1.5, courseHeight - JOINT);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}
