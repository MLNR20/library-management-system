import * as THREE from 'three';
import { hash01 } from '../../lib/libraryLayout.ts';
import { DOOR_HALF } from './floorPlan.ts';

// Things that dress up the hall and its tables: vases of flowers and potted plants.

const FLOWER_COLORS = ['#e45b78', '#f2b84b', '#f4f1de', '#b07cc6', '#ef8354'];
const VASE_COLORS = ['#3b5b8c', '#e8e0d0', '#8c3b3b', '#4f7a5a'];

interface SeeThrough {
    seeThrough: boolean;
}

const surface = (color: string, seeThrough: boolean, roughness = 0.7) => (
    <meshStandardMaterial color={color} roughness={roughness} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
);

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

interface PlantsProps extends SeeThrough {
    hall: number;
}

/** Potted plants in the corners of the hall and beside the doors. */
export function Plants({ hall, seeThrough }: PlantsProps) {
    const east = hall / 2;
    const aroundDoor = DOOR_HALF + 0.9;

    return (
        <group>
            <Planter position={[-hall / 2 + 0.6, 0, -hall / 2 + 0.6]} seed="corner-nw" seeThrough={seeThrough} />
            <Planter position={[east - 0.6, 0, -hall / 2 + 0.6]} seed="corner-ne" seeThrough={seeThrough} />
            <Planter position={[east - 0.6, 0, hall / 2 - 0.6]} seed="corner-se" seeThrough={seeThrough} />
            <Planter position={[-hall / 2 + 0.6, 0, hall / 2 - 0.6]} seed="corner-sw" seeThrough={seeThrough} />
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
