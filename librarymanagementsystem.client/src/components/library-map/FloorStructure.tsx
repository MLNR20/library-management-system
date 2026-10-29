import * as THREE from 'three';
import { STAIR_ZONE } from '../../lib/libraryLayout.ts';
import {
    CHAIR_OFFSET,
    COLUMN_RADIUS,
    COLUMN_Z,
    DESK_DEPTH,
    DESK_HEIGHT,
    DESK_LENGTH,
    SLAB_THICKNESS,
    STAIR_EDGE,
    STAIR_LANDING,
    TABLE_DEPTH,
    TABLE_HEIGHT,
    TABLE_LENGTH,
    columnXs,
    deskPosition,
    stairGeometry,
    tableXs,
    tableZ,
} from './floorPlan.ts';

const WALL_THICKNESS = 0.15;
const WALL_COLOR = '#d9cfbd';
const STAIR_COLOR = '#b89b78';
interface WallsProps {
    width: number;
    depth: number;
    height: number;
    seeThrough: boolean;
}

/** Back and side walls; the front stays open so the camera can look in. */
export function Walls({ width, depth, height, seeThrough }: WallsProps) {
    const walls = [
        { key: 'back', position: [0, height / 2, -depth / 2 - WALL_THICKNESS / 2], size: [width + WALL_THICKNESS * 2, height, WALL_THICKNESS] },
        { key: 'left', position: [-width / 2 - WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
        { key: 'right', position: [width / 2 + WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
    ] as const;

    return (
        <group>
            {walls.map(wall => (
                <mesh key={wall.key} position={wall.position}>
                    <boxGeometry args={wall.size} />
                    <meshStandardMaterial
                        color={WALL_COLOR}
                        roughness={0.9}
                        transparent={seeThrough}
                        opacity={seeThrough ? 0.3 : 1}
                        depthWrite={!seeThrough}
                    />
                </mesh>
            ))}
        </group>
    );
}

const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 2.1;
const DOOR_FRAME = 0.1;

interface DoorProps {
    position: [number, number, number];
    /** Rotation around the vertical axis; 0 faces +z. */
    rotationY: number;
    seeThrough: boolean;
}

/** A closed door with a frame and a knob, set against the inside face of a wall. */
function Door({ position, rotationY, seeThrough }: DoorProps) {
    const opacity = seeThrough ? 0.6 : 1;
    const knobX = DOOR_WIDTH / 2 - 0.16;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, (DOOR_HEIGHT + DOOR_FRAME) / 2, 0.03]}>
                <boxGeometry args={[DOOR_WIDTH + DOOR_FRAME * 2, DOOR_HEIGHT + DOOR_FRAME, 0.06]} />
                <meshStandardMaterial color="#4a3320" roughness={0.7} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[0, DOOR_HEIGHT / 2, 0.07]}>
                <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.06]} />
                <meshStandardMaterial color="#8a5a35" roughness={0.6} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[knobX, DOOR_HEIGHT * 0.48, 0.14]}>
                <sphereGeometry args={[0.06, 16, 12]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} transparent={seeThrough} opacity={opacity} />
            </mesh>
        </group>
    );
}

interface DoorsProps {
    width: number;
    depth: number;
    seeThrough: boolean;
}

/** One door in the back wall and one in the left wall, clear of the stairs on the right. */
export function Doors({ width, depth, seeThrough }: DoorsProps) {
    return (
        <group>
            <Door position={[-width / 2 + 2, 0, -depth / 2]} rotationY={0} seeThrough={seeThrough} />
            <Door position={[-width / 2, 0, 0]} rotationY={Math.PI / 2} seeThrough={seeThrough} />
        </group>
    );
}

const COLUMN_COLOR = '#e8e0d0';

const WINDOW_WIDTH = 1.1;
/** Height of the straight part; the arch on top adds half the width again. */
const WINDOW_HEIGHT = 1.5;
const WINDOW_SILL = 1.2;
const WINDOW_FRAME = 0.07;
const WINDOW_BAR = 0.025;

/** Outline of a window: straight sides from `bottom` up to `straight`, then a round arch on top. */
function archShape(width: number, straight: number, bottom: number): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, bottom);
    shape.lineTo(width / 2, bottom);
    shape.lineTo(width / 2, straight);
    shape.absarc(0, straight, width / 2, 0, Math.PI, false);
    shape.lineTo(-width / 2, bottom);
    return shape;
}

// Built once and shared by every window.
let sharedWindow: { frame: THREE.ExtrudeGeometry; glass: THREE.ShapeGeometry } | null = null;

function windowGeometry() {
    if (!sharedWindow) {
        const inner = archShape(WINDOW_WIDTH, WINDOW_HEIGHT, 0);
        const outer = archShape(WINDOW_WIDTH + WINDOW_FRAME * 2, WINDOW_HEIGHT, -WINDOW_FRAME);
        outer.holes.push(new THREE.Path(inner.getPoints(24)));
        sharedWindow = {
            frame: new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: false, curveSegments: 24 }),
            glass: new THREE.ShapeGeometry(inner, 24),
        };
    }
    return sharedWindow;
}

interface WindowPaneProps {
    position: [number, number, number];
    rotationY: number;
    seeThrough: boolean;
}

/** An arched window: slim frame, glass with a soft glow, glazing bars and a stone sill. */
function WindowPane({ position, rotationY, seeThrough }: WindowPaneProps) {
    const { frame, glass } = windowGeometry();
    const opacity = seeThrough ? 0.7 : 1;
    const archTop = WINDOW_HEIGHT + WINDOW_WIDTH / 2;
    const bars = [
        { key: 'vertical', position: [0, archTop / 2, 0.05], size: [WINDOW_BAR, archTop, WINDOW_BAR] },
        { key: 'transom', position: [0, WINDOW_HEIGHT * 0.55, 0.05], size: [WINDOW_WIDTH, WINDOW_BAR, WINDOW_BAR] },
        { key: 'springing', position: [0, WINDOW_HEIGHT, 0.05], size: [WINDOW_WIDTH, WINDOW_BAR, WINDOW_BAR] },
    ] as const;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <group position={[0, WINDOW_SILL, 0]}>
                <mesh geometry={glass} position={[0, 0, 0.02]}>
                    <meshStandardMaterial color="#cfe8f7" emissive="#bfe0f5" emissiveIntensity={0.5} transparent opacity={0.7} />
                </mesh>
                <mesh geometry={frame}>
                    <meshStandardMaterial color="#f6f1e7" roughness={0.5} transparent={seeThrough} opacity={opacity} />
                </mesh>
                {bars.map(bar => (
                    <mesh key={bar.key} position={bar.position}>
                        <boxGeometry args={bar.size} />
                        <meshStandardMaterial color="#f6f1e7" roughness={0.5} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                ))}
                <mesh position={[0, -WINDOW_FRAME - 0.03, 0.09]}>
                    <boxGeometry args={[WINDOW_WIDTH + 0.5, 0.06, 0.18]} />
                    <meshStandardMaterial color="#cfc6b5" roughness={0.8} transparent={seeThrough} opacity={opacity} />
                </mesh>
            </group>
        </group>
    );
}

/** Windows along the back wall (past the door) and the left wall (either side of the door). */
export function Windows({ width, depth, seeThrough }: DoorsProps) {
    const backXs: number[] = [];
    for (let x = -width / 2 + 4.2; x < width / 2 - 1; x += 3.4) backXs.push(x);

    return (
        <group>
            {backXs.map(x => (
                <WindowPane key={`back-${x}`} position={[x, 0, -depth / 2]} rotationY={0} seeThrough={seeThrough} />
            ))}
            {[-depth / 4, depth / 4].map(z => (
                <WindowPane key={`left-${z}`} position={[-width / 2, 0, z]} rotationY={Math.PI / 2} seeThrough={seeThrough} />
            ))}
        </group>
    );
}

/** Reading tables in the strip in front of the shelves, between the columns. */
export function Tables({ width, depth, seeThrough }: DoorsProps) {
    const centres = tableXs(width);
    const z = tableZ(depth);
    const opacity = seeThrough ? 0.7 : 1;

    return (
        <group>
            {centres.map(x => (
                <group key={x} position={[x, 0, z]}>
                    <mesh position={[0, TABLE_HEIGHT - 0.03, 0]}>
                        <boxGeometry args={[TABLE_LENGTH, 0.06, TABLE_DEPTH]} />
                        <meshStandardMaterial color="#a9774a" roughness={0.6} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                    {[-1, 1].flatMap(sx => [-1, 1].map(sz => ({ sx, sz }))).map(({ sx, sz }) => (
                        <mesh
                            key={`${sx}${sz}`}
                            position={[sx * (TABLE_LENGTH / 2 - 0.08), (TABLE_HEIGHT - 0.06) / 2, sz * (TABLE_DEPTH / 2 - 0.08)]}
                        >
                            <boxGeometry args={[0.07, TABLE_HEIGHT - 0.06, 0.07]} />
                            <meshStandardMaterial color="#6b4a2c" roughness={0.7} transparent={seeThrough} opacity={opacity} />
                        </mesh>
                    ))}
                    {[-CHAIR_OFFSET, CHAIR_OFFSET].map(offset => (
                        <Chair
                            key={offset}
                            position={[0, 0, offset]}
                            rotationY={offset < 0 ? 0 : Math.PI}
                            color="#7c5a3a"
                            seeThrough={seeThrough}
                        />
                    ))}
                </group>
            ))}
        </group>
    );
}

interface ChairProps {
    position: [number, number, number];
    /** Rotation around the vertical axis; 0 faces +z, with the backrest on the -z side. */
    rotationY: number;
    color: string;
    seeThrough: boolean;
}

const SEAT = 0.44;
const SEAT_HEIGHT = 0.45;

function Chair({ position, rotationY, color, seeThrough }: ChairProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const material = <meshStandardMaterial color={color} roughness={0.7} transparent={seeThrough} opacity={opacity} />;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, SEAT_HEIGHT, 0]}>
                <boxGeometry args={[SEAT, 0.05, SEAT]} />
                {material}
            </mesh>
            <mesh position={[0, SEAT_HEIGHT + 0.25, -SEAT / 2 + 0.025]}>
                <boxGeometry args={[SEAT, 0.42, 0.04]} />
                {material}
            </mesh>
            {[-1, 1].flatMap(sx => [-1, 1].map(sz => ({ sx, sz }))).map(({ sx, sz }) => (
                <mesh key={`${sx}${sz}`} position={[sx * (SEAT / 2 - 0.03), SEAT_HEIGHT / 2, sz * (SEAT / 2 - 0.03)]}>
                    <boxGeometry args={[0.04, SEAT_HEIGHT, 0.04]} />
                    {material}
                </mesh>
            ))}
        </group>
    );
}

/** The librarian's desk in the strip behind the shelves, with a monitor, a book stack and a chair behind it. */
export function LibrarianDesk({ depth, seeThrough }: Omit<DoorsProps, 'width'>) {
    const opacity = seeThrough ? 0.7 : 1;
    const { x, z } = deskPosition(depth);

    return (
        <group position={[x, 0, z]}>
            <mesh position={[0, (DESK_HEIGHT - 0.05) / 2, 0]}>
                <boxGeometry args={[DESK_LENGTH - 0.1, DESK_HEIGHT - 0.05, DESK_DEPTH - 0.1]} />
                <meshStandardMaterial color="#6b4a2c" roughness={0.7} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[0, DESK_HEIGHT - 0.025, 0.03]}>
                <boxGeometry args={[DESK_LENGTH, 0.05, DESK_DEPTH]} />
                <meshStandardMaterial color="#a9774a" roughness={0.5} transparent={seeThrough} opacity={opacity} />
            </mesh>
            {/* Monitor on a small stand, facing the patrons' side. */}
            <mesh position={[-0.5, DESK_HEIGHT + 0.19, -0.1]}>
                <boxGeometry args={[0.5, 0.32, 0.03]} />
                <meshStandardMaterial color="#1f2937" roughness={0.4} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[-0.5, DESK_HEIGHT + 0.04, -0.1]}>
                <boxGeometry args={[0.12, 0.06, 0.12]} />
                <meshStandardMaterial color="#374151" roughness={0.5} transparent={seeThrough} opacity={opacity} />
            </mesh>
            {/* A short stack of books. */}
            {[
                { y: 0.04, color: '#b45309', size: [0.3, 0.07, 0.22] },
                { y: 0.105, color: '#1d4ed8', size: [0.28, 0.06, 0.2] },
                { y: 0.16, color: '#15803d', size: [0.26, 0.05, 0.18] },
            ].map(book => (
                <mesh key={book.color} position={[0.55, DESK_HEIGHT + book.y, 0.1]}>
                    <boxGeometry args={book.size as [number, number, number]} />
                    <meshStandardMaterial color={book.color} roughness={0.7} transparent={seeThrough} opacity={opacity} />
                </mesh>
            ))}
            <Chair position={[0, 0, -0.75]} rotationY={0} color="#3f3f46" seeThrough={seeThrough} />
        </group>
    );
}

interface ColumnsProps {
    width: number;
    depth: number;
    height: number;
    seeThrough: boolean;
}

/** A row of round columns along the open front edge, stopping short of the stair strip. */
export function Columns({ width, depth, height, seeThrough }: ColumnsProps) {
    const z = COLUMN_Z(depth);
    const material = (
        <meshStandardMaterial color={COLUMN_COLOR} roughness={0.6} transparent={seeThrough} opacity={seeThrough ? 0.55 : 1} />
    );

    return (
        <group>
            {columnXs(width).map((x, i) => {
                return (
                    <group key={i} position={[x, 0, z]}>
                        <mesh position={[0, height / 2, 0]}>
                            <cylinderGeometry args={[COLUMN_RADIUS, COLUMN_RADIUS * 1.05, height, 20]} />
                            {material}
                        </mesh>
                        {/* Base and capital */}
                        {[0.06, height - 0.06].map(y => (
                            <mesh key={y} position={[0, y, 0]}>
                                <boxGeometry args={[COLUMN_RADIUS * 2.8, 0.12, COLUMN_RADIUS * 2.8]} />
                                {material}
                            </mesh>
                        ))}
                    </group>
                );
            })}
        </group>
    );
}

interface StairsProps {
    width: number;
    depth: number;
    /** Height from this floor up to the next one. */
    storey: number;
    direction: -1 | 1;
    /** True when the next floor is drawn: its slab covers the landing, so the block stops under it. */
    hasFloorAbove: boolean;
}

/** One solid flight along the right wall, climbing to a landing at the far end. */
export function Stairs({ width, depth, storey, direction, hasFloorAbove }: StairsProps) {
    const { count, rise, run } = stairGeometry(depth, storey);
    const x = width / 2 - STAIR_ZONE / 2;
    const startZ = -direction * (depth / 2 - STAIR_EDGE);
    const landingHeight = hasFloorAbove ? storey - SLAB_THICKNESS : storey;

    return (
        <group>
            {Array.from({ length: count }, (_, k) => {
                const height = (k + 1) * rise;
                return (
                    <mesh key={k} position={[x, height / 2, startZ + direction * (k + 0.5) * run]}>
                        <boxGeometry args={[STAIR_ZONE, height, run]} />
                        <meshStandardMaterial color={STAIR_COLOR} roughness={0.85} />
                    </mesh>
                );
            })}
            <mesh position={[x, landingHeight / 2, direction * (depth / 2 - STAIR_LANDING / 2)]}>
                <boxGeometry args={[STAIR_ZONE, landingHeight, STAIR_LANDING]} />
                <meshStandardMaterial color={STAIR_COLOR} roughness={0.85} />
            </mesh>
        </group>
    );
}
