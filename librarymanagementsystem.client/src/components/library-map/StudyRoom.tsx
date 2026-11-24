import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { STUDY_ROOM_DEPTH, STUDY_ROOM_WIDTH } from '../../lib/libraryLayout.ts';
import { FlowerVase } from './Decor.tsx';
import { Chair } from './FloorStructure.tsx';
import {
    STUDY_DOOR_HEIGHT,
    STUDY_DOOR_WIDTH,
    STUDY_HEIGHT,
    STUDY_TABLE_Z,
    STUDY_TV_HEIGHT,
    STUDY_WALL,
    TABLE_HEIGHT,
} from './floorPlan.ts';
import type { StudyRoomPlace } from './floorPlan.ts';
import { MAHOGANY, VELVET } from './ornamentShapes.ts';

const PLASTER = '#e8dec6';
const PANELLING = '#6b4a2c';
const TRIM = '#f1ece0';
const BRONZE = '#2c2824';
const BRASS = '#b5882b';
const GLASS = '#bfe0ee';
const RUG = '#2f4263';
const RUG_BORDER = '#b8892b';
const TABLE_TOP = '#a9774a';
const TV_WIDTH = 1.5;
const TV_HEIGHT = 0.86;
/** How far the door leaf is swung open into the room, in radians. */
const DOOR_OPEN = 1.75;
const PANELLING_HEIGHT = 1;

interface StudyRoomModelProps {
    room: StudyRoomPlace;
    seeThrough: boolean;
}

/**
 * A glass-walled study room: panelled plaster walls on three sides, a glazed front with a glass door standing open, a TV on
 * the back wall and a long table with chairs. It has no roof so it can be looked into from above.
 */
export function StudyRoomModel({ room, seeThrough }: StudyRoomModelProps) {
    const W = STUDY_ROOM_WIDTH;
    const D = STUDY_ROOM_DEPTH;
    const t = STUDY_WALL;
    const H = STUDY_HEIGHT;
    const opacity = seeThrough ? 0.7 : 1;
    const piece = (W - STUDY_DOOR_WIDTH) / 2;

    const solid = (color: string, roughness = 0.8) => (
        <meshStandardMaterial color={color} roughness={roughness} transparent={seeThrough} opacity={opacity} />
    );
    const bronze = <meshStandardMaterial color={BRONZE} roughness={0.4} metalness={0.5} transparent={seeThrough} opacity={opacity} />;
    const glass = (
        <meshStandardMaterial color={GLASS} roughness={0.05} metalness={0.1} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
    );

    // One panel of the glazed front: a panelled kick rail, a pane of glass and a bronze mullion and top rail.
    const frontPanel = (side: -1 | 1) => (
        <group key={side} position={[side * (STUDY_DOOR_WIDTH / 2 + piece / 2), 0, D / 2 - t / 2]}>
            <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[piece, 0.9, t]} />
                {solid(PANELLING)}
            </mesh>
            <mesh position={[0, 0.9 + (H - 1.0) / 2, 0]}>
                <planeGeometry args={[piece - 0.06, H - 1.0]} />
                {glass}
            </mesh>
            <mesh position={[0, H - 0.05, 0]}>
                <boxGeometry args={[piece, 0.1, t]} />
                {bronze}
            </mesh>
            <mesh position={[0, 0.9 + (H - 1.0) / 2, 0]}>
                <boxGeometry args={[0.04, H - 1.0, t * 0.6]} />
                {bronze}
            </mesh>
        </group>
    );

    const leaf = STUDY_DOOR_WIDTH - 0.03;

    return (
        <group position={[room.x, 0, room.z]} rotation={[0, room.door === 1 ? 0 : Math.PI, 0]}>
            {/* The rug, with a gilt border */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                <planeGeometry args={[W - 2 * t - 0.1, D - 2 * t - 0.1]} />
                <meshStandardMaterial color={RUG_BORDER} roughness={0.9} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                <planeGeometry args={[W - 2 * t - 0.3, D - 2 * t - 0.3]} />
                <meshStandardMaterial color={RUG} roughness={0.95} transparent={seeThrough} opacity={opacity} />
            </mesh>

            {/* Back and side walls, with dark panelling up the inside to chair-rail height and a white cornice on top */}
            <mesh position={[0, H / 2, -D / 2 + t / 2]}>
                <boxGeometry args={[W, H, t]} />
                {solid(PLASTER)}
            </mesh>
            {[-1, 1].map(side => (
                <mesh key={side} position={[side * (W / 2 - t / 2), H / 2, 0]}>
                    <boxGeometry args={[t, H, D]} />
                    {solid(PLASTER)}
                </mesh>
            ))}
            <mesh position={[0, PANELLING_HEIGHT / 2, -D / 2 + t + 0.02]}>
                <boxGeometry args={[W - 2 * t, PANELLING_HEIGHT, 0.04]} />
                {solid(PANELLING, 0.5)}
            </mesh>
            {[-1, 1].map(side => (
                <mesh key={side} position={[side * (W / 2 - t - 0.02), PANELLING_HEIGHT / 2, 0]}>
                    <boxGeometry args={[0.04, PANELLING_HEIGHT, D - 2 * t]} />
                    {solid(PANELLING, 0.5)}
                </mesh>
            ))}
            <mesh position={[0, H + 0.05, -D / 2 + t / 2]}>
                <boxGeometry args={[W + 0.08, 0.12, t + 0.08]} />
                {solid(TRIM, 0.6)}
            </mesh>
            {[-1, 1].map(side => (
                <mesh key={side} position={[side * (W / 2 - t / 2), H + 0.05, 0]}>
                    <boxGeometry args={[t + 0.08, 0.12, D + 0.08]} />
                    {solid(TRIM, 0.6)}
                </mesh>
            ))}

            {/* The glazed front: a pane either side of the door, and glass over the door */}
            {frontPanel(-1)}
            {frontPanel(1)}
            <mesh position={[0, STUDY_DOOR_HEIGHT + (H - STUDY_DOOR_HEIGHT) / 2, D / 2 - t / 2]}>
                <planeGeometry args={[STUDY_DOOR_WIDTH, H - STUDY_DOOR_HEIGHT - 0.1]} />
                {glass}
            </mesh>
            {[STUDY_DOOR_HEIGHT + 0.04, H - 0.05].map(y => (
                <mesh key={y} position={[0, y, D / 2 - t / 2]}>
                    <boxGeometry args={[STUDY_DOOR_WIDTH + 0.06, 0.1, t]} />
                    {bronze}
                </mesh>
            ))}

            {/* The door: a bronze frame round a pane of glass, hinged on the left and swung open into the room */}
            <group position={[-STUDY_DOOR_WIDTH / 2, 0, D / 2 - t / 2]} rotation={[0, DOOR_OPEN, 0]}>
                {[0.035, leaf - 0.035].map(x => (
                    <mesh key={x} position={[x, STUDY_DOOR_HEIGHT / 2, 0]}>
                        <boxGeometry args={[0.07, STUDY_DOOR_HEIGHT, 0.05]} />
                        {bronze}
                    </mesh>
                ))}
                {[0.125, STUDY_DOOR_HEIGHT - 0.05].map(y => (
                    <mesh key={y} position={[leaf / 2, y, 0]}>
                        <boxGeometry args={[leaf, y < 1 ? 0.25 : 0.1, 0.05]} />
                        {bronze}
                    </mesh>
                ))}
                <mesh position={[leaf / 2, 0.25 + (STUDY_DOOR_HEIGHT - 0.35) / 2, 0]}>
                    <planeGeometry args={[leaf - 0.14, STUDY_DOOR_HEIGHT - 0.35]} />
                    {glass}
                </mesh>
                <mesh position={[leaf - 0.14, 1.0, 0.06]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.45, 10]} />
                    <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.7} />
                </mesh>
            </group>

            <WallTv z={-D / 2 + t} seeThrough={seeThrough} />

            {/* The table, with a vase of flowers, chairs behind it (facing the door) and in front of it (facing the TV) */}
            <group position={[0, 0, STUDY_TABLE_Z]}>
                <FlowerVase position={[0, TABLE_HEIGHT, 0]} seed="study-table" scale={0.9} seeThrough={seeThrough} />
                <mesh position={[0, TABLE_HEIGHT - 0.03, 0]}>
                    <boxGeometry args={[2.2, 0.06, 0.9]} />
                    {solid(TABLE_TOP, 0.5)}
                </mesh>
                {[-1, 1].flatMap(sx => [-1, 1].map(sz => ({ sx, sz }))).map(({ sx, sz }) => (
                    <mesh key={`${sx}${sz}`} position={[sx * 1.0, (TABLE_HEIGHT - 0.06) / 2, sz * 0.37]}>
                        <boxGeometry args={[0.07, TABLE_HEIGHT - 0.06, 0.07]} />
                        {solid(MAHOGANY, 0.6)}
                    </mesh>
                ))}
                {[-0.75, 0, 0.75].map(x => (
                    <Chair key={`back${x}`} position={[x, 0, -0.8]} rotationY={0} upholstery={VELVET} seeThrough={seeThrough} />
                ))}
                {[-0.65, 0.65].map(x => (
                    <Chair key={`front${x}`} position={[x, 0, 0.8]} rotationY={Math.PI} upholstery={VELVET} seeThrough={seeThrough} />
                ))}
            </group>
        </group>
    );
}

/** A flat-screen TV hung on the back wall, showing a welcome slide. */
function WallTv({ z, seeThrough }: { z: number; seeThrough: boolean }) {
    const slide = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext('2d')!;
        const sky = context.createLinearGradient(0, 0, 320, 180);
        sky.addColorStop(0, '#13294f');
        sky.addColorStop(1, '#3b82f6');
        context.fillStyle = sky;
        context.fillRect(0, 0, 320, 180);
        context.fillStyle = 'rgba(255,255,255,0.92)';
        context.fillRect(28, 34, 150, 14);
        context.fillStyle = 'rgba(255,255,255,0.55)';
        context.fillRect(28, 62, 220, 8);
        context.fillRect(28, 80, 190, 8);
        context.fillRect(28, 98, 205, 8);
        context.fillStyle = 'rgba(251,191,36,0.9)';
        context.fillRect(28, 130, 64, 18);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, []);
    useEffect(() => () => slide.dispose(), [slide]);

    return (
        <group position={[0, STUDY_TV_HEIGHT, z + 0.045]}>
            <mesh>
                <boxGeometry args={[TV_WIDTH, TV_HEIGHT, 0.05]} />
                <meshStandardMaterial color="#0b0b0e" roughness={0.35} metalness={0.4} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
            </mesh>
            <mesh position={[0, 0, 0.026]}>
                <planeGeometry args={[TV_WIDTH - 0.08, TV_HEIGHT - 0.08]} />
                <meshStandardMaterial map={slide} emissiveMap={slide} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.2} />
            </mesh>
            {/* The standby light */}
            <mesh position={[TV_WIDTH / 2 - 0.06, -TV_HEIGHT / 2 + 0.03, 0.027]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
        </group>
    );
}
