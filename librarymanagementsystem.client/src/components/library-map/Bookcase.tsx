import { useMemo } from 'react';
import * as THREE from 'three';
import { InstancedPart } from './Ornament.tsx';
import { BOOKCASE_SHADOW, BOOKCASE_WOOD, GILT, UNIT_BALL, UNIT_BOX, place } from './ornamentShapes.ts';
import type { Vec3 } from './ornamentShapes.ts';
import { WALL_CASE_BAY, WALL_CASE_DEPTH, WALL_CASE_HEIGHT, wallBookcaseRuns } from './floorPlan.ts';

// The dressing that turns a plain shelf into a dark-wood library bookcase: a plinth, fluted pilasters at the corners, a
// crown cornice with dentils, and a gallery rail on top with pierced fretwork panels (a cross inside a diamond), as in an
// old panelled library.

/** Height of the gallery rail on top of the cornice. */
const GALLERY_HEIGHT = 0.3;
/** Thickness of a fretwork bar. */
const BAR = 0.022;
const DENTIL_PITCH = 0.08;
/** Panels of fretwork along the front and the back of the gallery. */
const FRONT_PANELS = 4;

/**
 * The bars of one fretwork panel `width` by `height`, centred on (x, y, z): a cross from corner to corner inside a diamond
 * joining the middles of the sides, with a gilt boss where they meet. A panel along z (on the bookcase's ends) is turned
 * a quarter about the vertical.
 */
function fretworkPanel(centre: Vec3, width: number, height: number, alongZ: boolean, bars: THREE.Matrix4[], bosses: THREE.Matrix4[]) {
    const slope = Math.atan2(height, width);
    const diagonal = Math.hypot(width, height);
    const pieces: [number, number, number, number][] = [
        [0, 0, diagonal, slope],
        [0, 0, diagonal, -slope],
        [width / 4, height / 4, diagonal / 2, -slope],
        [-width / 4, height / 4, diagonal / 2, slope],
        [width / 4, -height / 4, diagonal / 2, slope],
        [-width / 4, -height / 4, diagonal / 2, -slope],
    ];
    const [cx, cy, cz] = centre;
    for (const [u, v, length, angle] of pieces) {
        const position: Vec3 = alongZ ? [cx, cy + v, cz - u] : [cx + u, cy + v, cz];
        bars.push(place(position, [length, BAR, 0.02], [0, alongZ ? Math.PI / 2 : 0, angle]));
    }
    bosses.push(place(centre, [0.028, 0.028, 0.028]));
}

/** Where every piece of the dressing goes on a bookcase `width` across, `depth` deep, whose top shelf is at `height`. */
function bookcaseParts(width: number, depth: number, height: number) {
    const wood: THREE.Matrix4[] = [];
    const shadow: THREE.Matrix4[] = [];
    const gilt: THREE.Matrix4[] = [];
    const knobs: THREE.Matrix4[] = [];
    const box = (position: Vec3, size: Vec3) => wood.push(place(position, size));
    const front = depth / 2;

    // A plinth round the foot, with a gilt line along the front and back.
    box([0, 0.005, 0], [width + 0.1, 0.07, depth + 0.08]);
    for (const sz of [-1, 1]) gilt.push(place([0, 0.042, sz * (front + 0.043)], [width + 0.1, 0.01, 0.006]));

    // A fluted pilaster on each corner, front and back, with a base, a capital and a gilt lozenge under it.
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            const x = (sx * width) / 2;
            const z = sz * (front + 0.0175);
            box([x, height / 2, z], [0.12, height, 0.035]);
            box([x, 0.07, z], [0.16, 0.08, 0.05]);
            box([x, height - 0.03, z], [0.16, 0.06, 0.05]);
            for (const fx of [-0.03, 0, 0.03]) shadow.push(place([x + fx, height / 2, sz * (front + 0.036)], [0.012, height * 0.72, 0.004]));
            gilt.push(place([x, height - 0.12, sz * (front + 0.037)], [0.035, 0.035, 0.006], [0, 0, Math.PI / 4]));
        }
    }

    // The crown cornice: two stepped mouldings with a row of dentils under the upper one and a gilt fillet along it.
    box([0, height + 0.05, 0], [width + 0.14, 0.07, depth + 0.1]);
    box([0, height + 0.11, 0], [width + 0.22, 0.05, depth + 0.18]);
    const dentils = Math.floor((width + 0.1) / DENTIL_PITCH);
    for (let i = 0; i < dentils; i++) {
        const x = -((dentils - 1) * DENTIL_PITCH) / 2 + i * DENTIL_PITCH;
        for (const sz of [-1, 1]) box([x, height + 0.068, sz * (front + 0.065)], [0.04, 0.035, 0.03]);
    }
    for (const sz of [-1, 1]) gilt.push(place([0, height + 0.11, sz * (front + 0.093)], [width + 0.22, 0.012, 0.006]));

    // The gallery: posts with turned knobs, a bottom rail and a handrail all round, and fretwork panels between the posts.
    const g0 = height + 0.135;
    const zf = front + 0.02;
    const xf = width / 2;
    const postHeight = GALLERY_HEIGHT + 0.06;
    const panelHeight = GALLERY_HEIGHT - 0.035;
    const panelY = g0 + 0.035 + panelHeight / 2;
    for (const sz of [-1, 1]) {
        for (let i = 0; i <= FRONT_PANELS; i++) {
            const x = -xf + (i * width) / FRONT_PANELS;
            box([x, g0 + postHeight / 2, sz * zf], [0.05, postHeight, 0.05]);
            knobs.push(place([x, g0 + postHeight + 0.03, sz * zf], [0.032, 0.032, 0.032]));
        }
        box([0, g0 + 0.0175, sz * zf], [width, 0.035, 0.035]);
        box([0, g0 + GALLERY_HEIGHT + 0.0225, sz * zf], [width + 0.05, 0.045, 0.07]);
        for (let i = 0; i < FRONT_PANELS; i++) {
            const x = -xf + ((i + 0.5) * width) / FRONT_PANELS;
            fretworkPanel([x, panelY, sz * zf], width / FRONT_PANELS - 0.05, panelHeight, false, wood, gilt);
        }
    }
    for (const sx of [-1, 1]) {
        box([sx * xf, g0 + 0.0175, 0], [0.035, 0.035, zf * 2]);
        box([sx * xf, g0 + GALLERY_HEIGHT + 0.0225, 0], [0.07, 0.045, zf * 2 + 0.05]);
        fretworkPanel([sx * xf, panelY, 0], zf * 2 - 0.05, panelHeight, true, wood, gilt);
    }

    return { wood, shadow, gilt, knobs };
}

interface VictorianBookcaseProps {
    width: number;
    depth: number;
    /** Height of the top shelf, where the cornice sits. */
    height: number;
}

/** Plinth, pilasters, cornice and fretwork gallery for one bookcase, in the bookcase's own frame (front towards +z). */
export function VictorianBookcase({ width, depth, height }: VictorianBookcaseProps) {
    const parts = useMemo(() => bookcaseParts(width, depth, height), [width, depth, height]);

    return (
        <group>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.wood}>
                <meshStandardMaterial color={BOOKCASE_WOOD} roughness={0.45} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.shadow}>
                <meshStandardMaterial color={BOOKCASE_SHADOW} roughness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.gilt}>
                <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={parts.knobs}>
                <meshStandardMaterial color={BOOKCASE_WOOD} roughness={0.35} />
            </InstancedPart>
        </group>
    );
}

/** Leather bindings: oxblood, claret, bottle green, forest, navy, slate, tan, chestnut, umber, ochre, plum and black. */
const BINDINGS = ['#5b1a18', '#7a2a1f', '#1f3a2e', '#2c4a3a', '#1d2b4a', '#33415c', '#8a6a3a', '#6e4326', '#3b2a20', '#8c6b2f', '#4a1f2e', '#1e1b1a'];
/** Where the shelves of a wall bookcase sit, from the one on the plinth to the top board. */
const WALL_BOARDS = [0.1, 0.47, 0.84, 1.21, 1.58];
const BOARD = 0.025;
/** The bookcases stand a little off the wall, clear of the panelling. */
const WALL_OFFSET = 0.07;

// Tiny seeded random generator, so every bookcase keeps the same books from one load to the next.
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
 * Every piece of the wall bookcases and the books on them, in the hall. Each run is built in its own frame (x along the
 * wall, z out from it) and turned into place. Books stand to the front of each shelf, packed side by side with now and
 * then a gap, in varied heights, thicknesses and leather colours; most carry two gilt bands on the spine.
 */
function wallCaseParts(hall: number) {
    const wood: THREE.Matrix4[] = [];
    const shadow: THREE.Matrix4[] = [];
    const gilt: THREE.Matrix4[] = [];
    const books: THREE.Matrix4[] = [];
    const bookColors: THREE.Color[] = [];
    const depth = WALL_CASE_DEPTH - WALL_OFFSET;
    const middle = WALL_OFFSET + depth / 2;
    const front = WALL_OFFSET + depth;

    for (const run of wallBookcaseRuns(hall)) {
        const frame = place([run.x, 0, run.z], [1, 1, 1], [0, run.rotationY, 0]);
        const at = (position: Vec3, scale: Vec3, rotation?: Vec3) => frame.clone().multiply(place(position, scale, rotation));
        const length = run.bays * WALL_CASE_BAY;
        const random = seededRandom(Math.round(run.x * 97 + run.z * 131 + 7));

        // Carcass: plinth, back, shelf boards, the uprights between bays, and a two-step cornice with a gilt fillet.
        wood.push(at([0, 0.05, middle + 0.01], [length + 0.04, 0.1, depth + 0.02]));
        shadow.push(at([0, 0.84, WALL_OFFSET + 0.01], [length, 1.5, 0.02]));
        for (const y of WALL_BOARDS) wood.push(at([0, y, middle], [length, BOARD, depth]));
        for (let j = 0; j <= run.bays; j++) {
            const x = -length / 2 + j * WALL_CASE_BAY;
            wood.push(at([x, 0.84, middle + 0.005], [0.045, 1.48, depth + 0.01]));
            gilt.push(at([x, 1.45, front + 0.012], [0.03, 0.03, 0.006], [0, 0, Math.PI / 4]));
        }
        wood.push(at([0, 1.62, middle + 0.025], [length + 0.08, 0.06, depth + 0.05]));
        wood.push(at([0, WALL_CASE_HEIGHT - 0.0175, middle + 0.045], [length + 0.12, 0.035, depth + 0.09]));
        gilt.push(at([0, WALL_CASE_HEIGHT - 0.0175, front + 0.093], [length + 0.12, 0.01, 0.006]));

        // Books, bay by bay and shelf by shelf.
        for (let j = 0; j < run.bays; j++) {
            const left = -length / 2 + j * WALL_CASE_BAY + 0.035;
            const right = left + WALL_CASE_BAY - 0.07;
            for (let i = 0; i < WALL_BOARDS.length - 1; i++) {
                const floor = WALL_BOARDS[i] + BOARD / 2;
                let cursor = left;
                while (true) {
                    if (random() < 0.04) cursor += 0.04 + random() * 0.05;
                    const width = 0.022 + random() * 0.04;
                    if (cursor + width > right) break;
                    const height = 0.2 + random() * 0.12;
                    const bookDepth = 0.17 + random() * 0.07;
                    const x = cursor + width / 2;
                    books.push(at([x, floor + height / 2, front - 0.03 - bookDepth / 2], [width, height, bookDepth]));
                    bookColors.push(
                        new THREE.Color(BINDINGS[Math.floor(random() * BINDINGS.length)]).offsetHSL(0, 0, (random() - 0.5) * 0.08),
                    );
                    if (random() < 0.6) {
                        for (const band of [0.14, 0.84]) {
                            gilt.push(at([x, floor + height * band, front - 0.028], [width + 0.002, 0.008, 0.004]));
                        }
                    }
                    cursor += width + 0.002;
                }
            }
        }
    }
    return { wood, shadow, gilt, books, bookColors };
}

/** The ground floor's low dark-wood bookcases along the walls, filled with books. Decoration only: not shelves from the catalogue. */
export function WallBookcases({ hall }: { hall: number }) {
    const parts = useMemo(() => wallCaseParts(hall), [hall]);

    return (
        <group>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.wood}>
                <meshStandardMaterial color={BOOKCASE_WOOD} roughness={0.45} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.shadow}>
                <meshStandardMaterial color={BOOKCASE_SHADOW} roughness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.books} colors={parts.bookColors}>
                <meshStandardMaterial color="#ffffff" roughness={0.75} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.gilt}>
                <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} />
            </InstancedPart>
        </group>
    );
}
