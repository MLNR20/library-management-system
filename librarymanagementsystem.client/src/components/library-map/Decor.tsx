import * as THREE from 'three';
import { hash01 } from '../../lib/libraryLayout.ts';
import { DOOR_HALF, WINDOW_HEIGHT, WINDOW_SILL, backWindowXs } from './floorPlan.ts';

// Things that dress up the walls and tables: framed paintings, brass wall lamps, vases of flowers and potted plants.

const GILT = '#b8892b';
const BRASS = '#b5882b';

const PALETTES = [
    { sky: '#9fc5e8', ground: '#5d8a4a', accent: '#f6d365' },
    { sky: '#e8b8a0', ground: '#6b4f3a', accent: '#fff3c4' },
    { sky: '#7d93b8', ground: '#2f4f4f', accent: '#f4f1de' },
    { sky: '#c9d6a3', ground: '#8a6d3b', accent: '#fbe7a1' },
];

const FLOWER_COLORS = ['#e45b78', '#f2b84b', '#f4f1de', '#b07cc6', '#ef8354'];
const VASE_COLORS = ['#3b5b8c', '#e8e0d0', '#8c3b3b', '#4f7a5a'];

interface SeeThrough {
    seeThrough: boolean;
}

const surface = (color: string, seeThrough: boolean, roughness = 0.7) => (
    <meshStandardMaterial color={color} roughness={roughness} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
);

interface PaintingProps extends SeeThrough {
    /** Middle of the painting, on the wall's surface. */
    position: [number, number, number];
    /** Rotation around the vertical axis; 0 faces +z. */
    rotationY: number;
    seed: string;
}

/** A gilt-framed painting: a landscape or a portrait, in one of a few palettes. */
export function Painting({ position, rotationY, seed, seeThrough }: PaintingProps) {
    const portrait = hash01(seed) < 0.5;
    const width = portrait ? 0.8 : 1;
    const height = portrait ? 1.05 : 0.75;
    const palette = PALETTES[Math.floor(hash01(`${seed}p`) * PALETTES.length)];
    const frame = 0.08;
    const gilt = surface(GILT, seeThrough, 0.4);

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {[-1, 1].map(side => (
                <group key={side}>
                    <mesh position={[0, side * (height / 2 + frame / 2), 0.035]}>
                        <boxGeometry args={[width + frame * 2, frame, 0.07]} />
                        {gilt}
                    </mesh>
                    <mesh position={[side * (width / 2 + frame / 2), 0, 0.035]}>
                        <boxGeometry args={[frame, height, 0.07]} />
                        {gilt}
                    </mesh>
                </group>
            ))}
            <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[width, height]} />
                {surface(palette.sky, seeThrough, 0.9)}
            </mesh>
            {portrait ? (
                <>
                    <mesh position={[0, -height * 0.3, 0.025]}>
                        <planeGeometry args={[width * 0.7, height * 0.35]} />
                        {surface('#2b2b33', seeThrough, 0.9)}
                    </mesh>
                    <mesh position={[0, height * 0.1, 0.025]} scale={[1, 1.35, 1]}>
                        <circleGeometry args={[width * 0.2, 20]} />
                        {surface(palette.ground, seeThrough, 0.9)}
                    </mesh>
                    <mesh position={[0, height * 0.08, 0.03]} scale={[1, 1.25, 1]}>
                        <circleGeometry args={[width * 0.15, 20]} />
                        {surface('#e9c9a6', seeThrough, 0.9)}
                    </mesh>
                </>
            ) : (
                <>
                    <mesh position={[0, -height * 0.3, 0.025]}>
                        <planeGeometry args={[width, height * 0.4]} />
                        {surface(palette.ground, seeThrough, 0.9)}
                    </mesh>
                    <mesh position={[width * 0.22, height * 0.16, 0.025]}>
                        <circleGeometry args={[height * 0.12, 20]} />
                        {surface(palette.accent, seeThrough, 0.9)}
                    </mesh>
                    {/* A lone tree */}
                    <mesh position={[-width * 0.25, -height * 0.12, 0.03]}>
                        <planeGeometry args={[0.04, height * 0.25]} />
                        {surface('#4a3320', seeThrough, 0.9)}
                    </mesh>
                    <mesh position={[-width * 0.25, height * 0.06, 0.035]}>
                        <circleGeometry args={[height * 0.14, 16]} />
                        {surface('#3f6b3a', seeThrough, 0.9)}
                    </mesh>
                </>
            )}
        </group>
    );
}

interface WallLampProps extends SeeThrough {
    /** Where the lamp meets the wall. */
    position: [number, number, number];
    /** Rotation around the vertical axis; 0 faces +z. */
    rotationY: number;
}

/** A brass wall lamp: back plate, a short arm and a glowing glass globe under a small cap. */
export function WallLamp({ position, rotationY, seeThrough }: WallLampProps) {
    const brass = surface(BRASS, seeThrough, 0.3);

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
                {brass}
            </mesh>
            <mesh position={[0, 0, 0.1]}>
                <boxGeometry args={[0.03, 0.03, 0.18]} />
                {brass}
            </mesh>
            <mesh position={[0, 0.07, 0.2]}>
                <sphereGeometry args={[0.1, 16, 12]} />
                <meshStandardMaterial color="#fff1c2" emissive="#ffd27a" emissiveIntensity={1.3} transparent opacity={0.92} />
            </mesh>
            <mesh position={[0, 0.19, 0.2]}>
                <coneGeometry args={[0.1, 0.08, 16]} />
                {brass}
            </mesh>
        </group>
    );
}

interface FlowerVaseProps extends SeeThrough {
    /** Where the foot of the vase stands. */
    position: [number, number, number];
    seed: string;
    scale?: number;
}

/** A small ceramic vase with a bunch of flowers. */
export function FlowerVase({ position, seed, seeThrough, scale = 1 }: FlowerVaseProps) {
    const vase = VASE_COLORS[Math.floor(hash01(`${seed}v`) * VASE_COLORS.length)];
    const blooms = [0, 1, 2, 3, 4].map(i => ({
        angle: (i / 5) * Math.PI * 2 + hash01(`${seed}a${i}`),
        color: FLOWER_COLORS[Math.floor(hash01(`${seed}f${i}`) * FLOWER_COLORS.length)],
    }));

    return (
        <group position={position} scale={scale}>
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.045, 0.07, 0.2, 14]} />
                {surface(vase, seeThrough, 0.35)}
            </mesh>
            <mesh position={[0, 0.215, 0]}>
                <cylinderGeometry args={[0.05, 0.045, 0.03, 14]} />
                {surface(vase, seeThrough, 0.35)}
            </mesh>
            {blooms.map(({ angle, color }, i) => (
                <group key={i} position={[0, 0.22, 0]} rotation={[Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4]}>
                    <mesh position={[0, 0.13, 0]}>
                        <cylinderGeometry args={[0.006, 0.006, 0.26, 6]} />
                        {surface('#3f6b3a', seeThrough)}
                    </mesh>
                    <mesh position={[0, 0.28, 0]}>
                        <sphereGeometry args={[0.045, 10, 8]} />
                        {surface(color, seeThrough, 0.6)}
                    </mesh>
                </group>
            ))}
            <group position={[0, 0.22, 0]} scale={0.22}>
                {[0, 1, 2, 3, 4].map(i => (
                    <Frond
                        key={i}
                        yaw={(i / 5) * Math.PI * 2 + hash01(`${seed}ly${i}`)}
                        pitch={0.5 + hash01(`${seed}lp${i}`) * 0.5}
                        length={0.8 + hash01(`${seed}ll${i}`) * 0.4}
                        width={0.35}
                        color={LEAF_GREENS[i % LEAF_GREENS.length]}
                        seeThrough={seeThrough}
                    />
                ))}
            </group>
        </group>
    );
}

// A leaf blade as a flat lens, one unit long and one unit wide, standing along +y and facing +z. Built once and scaled per leaf.
let sharedLeaf: THREE.ShapeGeometry | null = null;

function leafGeometry() {
    if (!sharedLeaf) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(0.9, 0.25, 0.7, 0.75, 0, 1);
        shape.bezierCurveTo(-0.7, 0.75, -0.9, 0.25, 0, 0);
        sharedLeaf = new THREE.ShapeGeometry(shape, 12);
    }
    return sharedLeaf;
}

const LEAF_GREENS = ['#2f6a33', '#3f7a3a', '#4b8a3f', '#2a5e30'];

interface FrondProps extends SeeThrough {
    yaw: number;
    pitch: number;
    length: number;
    width: number;
    color: string;
}

/** One frond: two leaf blades end to end, the second bending further over, so it arches like a real palm leaf. */
function Frond({ yaw, pitch, length, width, color, seeThrough }: FrondProps) {
    const leaf = leafGeometry();
    const material = (
        <meshStandardMaterial color={color} roughness={0.55} side={THREE.DoubleSide} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
    );

    return (
        <group rotation={[0, yaw, 0]}>
            <group rotation={[pitch, 0, 0]}>
                <mesh geometry={leaf} scale={[width, length * 0.55, 1]}>
                    {material}
                </mesh>
                <group position={[0, length * 0.55, 0]} rotation={[0.55, 0, 0]}>
                    <mesh geometry={leaf} scale={[width * 0.85, length * 0.5, 1]}>
                        {material}
                    </mesh>
                </group>
            </group>
        </group>
    );
}

interface PlanterProps extends SeeThrough {
    position: [number, number, number];
    seed: string;
}

/** A glazed-terracotta pot on a saucer with a full, leafy palm-like plant: fronds arching out at different lengths and heights. */
export function Planter({ position, seed, seeThrough }: PlanterProps) {
    const fronds = Array.from({ length: 16 }, (_, i) => ({
        yaw: (i / 16) * Math.PI * 2 + hash01(`${seed}y${i}`) * 0.35,
        // Low fronds spread wide, the later ones stand more upright.
        pitch: 0.25 + (1 - i / 16) * 0.8 + hash01(`${seed}p${i}`) * 0.2,
        length: 0.7 + (i / 16) * 0.5 + hash01(`${seed}l${i}`) * 0.3,
        width: 0.2 + hash01(`${seed}w${i}`) * 0.08,
        color: LEAF_GREENS[Math.floor(hash01(`${seed}c${i}`) * LEAF_GREENS.length)],
    }));

    return (
        <group position={position}>
            <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.3, 0.32, 0.06, 20]} />
                {surface('#7d4a2e', seeThrough, 0.7)}
            </mesh>
            <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.28, 0.2, 0.4, 20]} />
                {surface('#a35a38', seeThrough, 0.55)}
            </mesh>
            <mesh position={[0, 0.46, 0]}>
                <cylinderGeometry args={[0.3, 0.28, 0.06, 20]} />
                {surface('#8f4e30', seeThrough, 0.55)}
            </mesh>
            <mesh position={[0, 0.47, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.04, 20]} />
                {surface('#3a2a1c', seeThrough, 0.95)}
            </mesh>
            <group position={[0, 0.48, 0]}>
                {fronds.map((frond, i) => (
                    <Frond key={i} {...frond} seeThrough={seeThrough} />
                ))}
            </group>
        </group>
    );
}

interface WallDecorProps extends SeeThrough {
    hall: number;
    /** How far the wings reach past the east edge of the hall. */
    reach: number;
}

/** Paintings with a lamp either side of each, on every wall, plus plants in the corners and beside the doors. */
export function WallDecor({ hall, reach, seeThrough }: WallDecorProps) {
    // Level with the middle of the windows.
    const y = WINDOW_SILL + WINDOW_HEIGHT / 2;
    const lampY = y + 0.1;
    const lampGap = 0.76;
    const east = hall / 2 + reach;
    const aroundDoor = DOOR_HALF + 0.9;

    // Back wall: between windows that stand close together (the north door's gap is left alone), and above the lobby.
    const windowXs = backWindowXs(hall, reach);
    const backXs = [
        -hall / 2 + 1.8,
        ...windowXs
            .slice(1)
            .map((x, i) => [windowXs[i], x])
            .filter(([a, b]) => b - a < 4)
            .map(([a, b]) => (a + b) / 2),
    ];
    // The east wall is the building's outer wall, beyond the wings. The west wall has the main door in the middle.
    const eastZs = [-(hall * 3) / 8, 0, (hall * 3) / 8];
    const westZs = [-hall / 4, hall / 4];

    return (
        <group>
            {backXs.map(x => (
                <group key={`back-${x}`}>
                    <Painting position={[x, y, -hall / 2]} rotationY={0} seed={`b${x}`} seeThrough={seeThrough} />
                    {[-1, 1].map(side => (
                        <WallLamp key={side} position={[x + side * lampGap, lampY, -hall / 2]} rotationY={0} seeThrough={seeThrough} />
                    ))}
                </group>
            ))}
            {eastZs.map(z => (
                <group key={`east-${z}`}>
                    <Painting position={[east, y, z]} rotationY={-Math.PI / 2} seed={`e${z}`} seeThrough={seeThrough} />
                    {[-1, 1].map(side => (
                        <WallLamp key={side} position={[east, lampY, z + side * lampGap]} rotationY={-Math.PI / 2} seeThrough={seeThrough} />
                    ))}
                </group>
            ))}
            {westZs.map(z => (
                <group key={`west-${z}`}>
                    <Painting position={[-hall / 2, y, z]} rotationY={Math.PI / 2} seed={`l${z}`} seeThrough={seeThrough} />
                    {[-1, 1].map(side => (
                        <WallLamp key={side} position={[-hall / 2, lampY, z + side * lampGap]} rotationY={Math.PI / 2} seeThrough={seeThrough} />
                    ))}
                </group>
            ))}

            <Planter position={[-hall / 2 + 0.6, 0, -hall / 2 + 0.6]} seed="corner-nw" seeThrough={seeThrough} />
            <Planter position={[east - 0.6, 0, -hall / 2 + 0.6]} seed="corner-ne" seeThrough={seeThrough} />
            <Planter position={[east - 0.6, 0, hall / 2 - 0.6]} seed="corner-se" seeThrough={seeThrough} />
            {[-1, 1].map(side => (
                <group key={side}>
                    <Planter position={[-hall / 2 + 0.55, 0, side * aroundDoor]} seed={`west-door${side}`} seeThrough={seeThrough} />
                    <Planter position={[side * aroundDoor, 0, -hall / 2 + 0.6]} seed={`north-door${side}`} seeThrough={seeThrough} />
                    <Planter position={[side * aroundDoor, 0, hall / 2 - 0.6]} seed={`south-door${side}`} seeThrough={seeThrough} />
                </group>
            ))}
        </group>
    );
}
