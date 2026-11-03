import * as THREE from 'three';
import { hash01 } from '../../lib/libraryLayout.ts';
import { FlowerVase } from './Decor.tsx';
import {
    CHAIR_OFFSET,
    COLUMN_RADIUS,
    COLUMN_Z,
    DESK_DEPTH,
    DESK_HEIGHT,
    DESK_LENGTH,
    DOOR_Z,
    SLAB_THICKNESS,
    STAIR_EDGE,
    STAIR_LANDING,
    TABLE_DEPTH,
    TABLE_HEIGHT,
    TABLE_LENGTH,
    WALKWAY_WIDTH,
    WINDOW_HEIGHT,
    WINDOW_SILL,
    WINDOW_WIDTH,
    backWindowXs,
    columnXs,
    deskPosition,
    STAIR_WIDTH,
    flightFrame,
    stairGeometry,
    tableXs,
    tableZ,
} from './floorPlan.ts';

const WALL_THICKNESS = 0.15;
const WALL_COLOR = '#d9cfbd';
const STAIR_COLOR = '#7a5230';
const WOOD_DARK = '#4e3520';
const WOOD_MID = '#6b4a2c';
const WOOD_PANEL = '#7d5934';
/** Height of the wooden dado along the foot of every wall; it stays below the window sills. */
const WAINSCOT_HEIGHT = 0.8;

interface WainscotProps {
    length: number;
    seeThrough: boolean;
}

/** Wooden panelling on a wall: skirting board, raised panels and a cap rail. Runs along x and faces +z, against a wall at z = 0. */
function Wainscot({ length, seeThrough }: WainscotProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const wood = (color: string) => <meshStandardMaterial color={color} roughness={0.6} transparent={seeThrough} opacity={opacity} />;
    const count = Math.max(1, Math.round(length / 1.1));
    const panelWidth = length / count;

    return (
        <group>
            <mesh position={[0, WAINSCOT_HEIGHT / 2, 0.03]}>
                <boxGeometry args={[length, WAINSCOT_HEIGHT, 0.06]} />
                {wood(WOOD_MID)}
            </mesh>
            <mesh position={[0, 0.09, 0.06]}>
                <boxGeometry args={[length, 0.18, 0.06]} />
                {wood(WOOD_DARK)}
            </mesh>
            <mesh position={[0, WAINSCOT_HEIGHT + 0.015, 0.06]}>
                <boxGeometry args={[length, 0.05, 0.11]} />
                {wood(WOOD_DARK)}
            </mesh>
            {Array.from({ length: count }, (_, i) => (
                <mesh key={i} position={[-length / 2 + panelWidth * (i + 0.5), 0.5, 0.075]}>
                    <boxGeometry args={[panelWidth - 0.16, 0.5, 0.03]} />
                    {wood(WOOD_PANEL)}
                </mesh>
            ))}
        </group>
    );
}

/** Width of the gap the main door leaves in the left wall's panelling. */
const DOOR_GAP = 2.8;

interface WallsProps {
    width: number;
    depth: number;
    height: number;
    seeThrough: boolean;
    /** The main door stands in the middle of the left wall; the panelling stops either side of it. */
    hasDoor?: boolean;
}

/** Back and side walls with wooden panelling at their foot; the front stays open so the camera can look in. */
export function Walls({ width, depth, height, seeThrough, hasDoor = false }: WallsProps) {
    const walls = [
        { key: 'back', position: [0, height / 2, -depth / 2 - WALL_THICKNESS / 2], size: [width + WALL_THICKNESS * 2, height, WALL_THICKNESS] },
        { key: 'left', position: [-width / 2 - WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
        { key: 'right', position: [width / 2 + WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
    ] as const;

    // Stretches of the left wall that get panelling, as [from, to] along z.
    const leftRuns: [number, number][] = hasDoor
        ? [
              [-depth / 2, -DOOR_GAP / 2],
              [DOOR_GAP / 2, depth / 2],
          ]
        : [[-depth / 2, depth / 2]];

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
            <group position={[0, 0, -depth / 2]}>
                <Wainscot length={width} seeThrough={seeThrough} />
            </group>
            <group position={[width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <Wainscot length={depth} seeThrough={seeThrough} />
            </group>
            {leftRuns.map(([from, to]) => (
                <group key={from} position={[-width / 2, 0, (from + to) / 2]} rotation={[0, Math.PI / 2, 0]}>
                    <Wainscot length={to - from} seeThrough={seeThrough} />
                </group>
            ))}
        </group>
    );
}

interface DoorsProps {
    width: number;
    depth: number;
    seeThrough: boolean;
}

const DOOR_OPENING = 2;
/** Height of the door leaves; the fanlight above them is a half circle as wide as the opening. */
const DOOR_STRAIGHT = 2.3;
/** How deep the painted surround reaches into the room, and how thick the door leaves are. */
const DOOR_REVEAL = 0.4;
const LEAF_THICKNESS = 0.28;
const LEAF_GAP = 0.03;
const DOOR_PAINT = '#5a3a22';
const PANEL_PAINT = '#6e4a2c';
const TRIM_PAINT = '#f1ece0';
const BRASS = '#b5882b';

// Built once: the surround (flat sides under a round arch) and the half-disc of glass for the fanlight.
let sharedDoorway: { surround: THREE.ExtrudeGeometry; fanlight: THREE.ShapeGeometry } | null = null;

function doorwayGeometry() {
    if (!sharedDoorway) {
        const inner = archShape(DOOR_OPENING, DOOR_STRAIGHT, 0);
        const outer = archShape(DOOR_OPENING + 0.7, DOOR_STRAIGHT, 0);
        outer.holes.push(new THREE.Path(inner.getPoints(32)));

        const fan = new THREE.Shape();
        const radius = DOOR_OPENING / 2;
        fan.moveTo(-radius, 0);
        fan.lineTo(radius, 0);
        fan.absarc(0, 0, radius, 0, Math.PI, false);

        sharedDoorway = {
            surround: new THREE.ExtrudeGeometry(outer, { depth: DOOR_REVEAL, bevelEnabled: false, curveSegments: 32 }),
            fanlight: new THREE.ShapeGeometry(fan, 32),
        };
    }
    return sharedDoorway;
}

interface VictorianDoorProps {
    position: [number, number, number];
    /** Rotation around the vertical axis; 0 faces +z. */
    rotationY: number;
    seeThrough: boolean;
}

/**
 * The main entrance: a Victorian double door. Each leaf is a thick, painted four-panel door (two panels over two) with
 * brass furniture, under a glazed fanlight in a white surround, with a stone step and a lantern either side.
 * Set against the inside face of a wall.
 */
function VictorianDoor({ position, rotationY, seeThrough }: VictorianDoorProps) {
    const { surround, fanlight } = doorwayGeometry();
    const opacity = seeThrough ? 0.7 : 1;
    const radius = DOOR_OPENING / 2;
    const leafWidth = radius - LEAF_GAP / 2;
    // Leaves sit a little way into the doorway, so the reveal frames them.
    const leafZ = 0.08;

    const trim = <meshStandardMaterial color={TRIM_PAINT} roughness={0.6} transparent={seeThrough} opacity={opacity} />;
    const paint = <meshStandardMaterial color={DOOR_PAINT} roughness={0.45} transparent={seeThrough} opacity={opacity} />;
    const panelPaint = <meshStandardMaterial color={PANEL_PAINT} roughness={0.45} transparent={seeThrough} opacity={opacity} />;
    const brass = <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.8} transparent={seeThrough} opacity={opacity} />;

    // Two columns of panels, a lower and an upper row.
    const stile = 0.12;
    const panelWidth = (leafWidth - stile * 3) / 2;
    const panels = [
        { y: 0.65, height: 0.8 },
        { y: 1.7, height: 0.9 },
    ];

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh geometry={surround}>{trim}</mesh>
            {/* Plinths at the foot of the surround */}
            {[-1, 1].map(side => (
                <mesh key={side} position={[side * (radius + 0.175), 0.15, DOOR_REVEAL / 2]}>
                    <boxGeometry args={[0.4, 0.3, DOOR_REVEAL + 0.06]} />
                    {trim}
                </mesh>
            ))}

            {([-1, 1] as const).map(side => (
                <group key={side} position={[side * (leafWidth / 2 + LEAF_GAP / 2), 0, leafZ]}>
                    <mesh position={[0, DOOR_STRAIGHT / 2, LEAF_THICKNESS / 2]}>
                        <boxGeometry args={[leafWidth, DOOR_STRAIGHT, LEAF_THICKNESS]} />
                        {paint}
                    </mesh>
                    {[0, 1].flatMap(column => panels.map(panel => ({ column, ...panel }))).map(panel => (
                        <mesh
                            key={`${panel.column}-${panel.y}`}
                            position={[-leafWidth / 2 + stile + panelWidth / 2 + panel.column * (panelWidth + stile), panel.y, LEAF_THICKNESS + 0.02]}
                        >
                            <boxGeometry args={[panelWidth, panel.height, 0.05]} />
                            {panelPaint}
                        </mesh>
                    ))}
                    {/* Brass kick plate, a pull handle by the meeting edge and a keyhole plate */}
                    <mesh position={[0, 0.12, LEAF_THICKNESS + 0.01]}>
                        <boxGeometry args={[leafWidth - 0.1, 0.2, 0.02]} />
                        {brass}
                    </mesh>
                    <mesh position={[-side * (leafWidth / 2 - 0.06), 1.1, LEAF_THICKNESS + 0.08]}>
                        <boxGeometry args={[0.035, 0.4, 0.05]} />
                        {brass}
                    </mesh>
                    <mesh position={[-side * (leafWidth / 2 - 0.06), 1.1, LEAF_THICKNESS + 0.12]}>
                        <sphereGeometry args={[0.045, 12, 10]} />
                        {brass}
                    </mesh>
                </group>
            ))}

            {/* Transom bar and the semicircular fanlight, with glazing bars fanning out from the middle */}
            <mesh position={[0, DOOR_STRAIGHT + 0.04, 0.12]}>
                <boxGeometry args={[DOOR_OPENING, 0.08, 0.12]} />
                {trim}
            </mesh>
            <group position={[0, DOOR_STRAIGHT + 0.08, 0.14]}>
                <mesh geometry={fanlight}>
                    <meshStandardMaterial color="#cfe8f7" emissive="#bfe0f5" emissiveIntensity={0.5} transparent opacity={0.75} side={THREE.DoubleSide} />
                </mesh>
                {[1, 2, 3, 4, 5].map(i => (
                    <mesh key={i} position={[Math.cos((i * Math.PI) / 6) * (radius / 2), Math.sin((i * Math.PI) / 6) * (radius / 2), 0.01]} rotation={[0, 0, (i * Math.PI) / 6]}>
                        <boxGeometry args={[radius, 0.03, 0.04]} />
                        {trim}
                    </mesh>
                ))}
                <mesh position={[0, 0.25, 0.01]}>
                    <ringGeometry args={[0.25, 0.28, 24, 1, 0, Math.PI]} />
                    {trim}
                </mesh>
            </group>

            {/* Stone step */}
            <mesh position={[0, 0.05, DOOR_REVEAL / 2 + 0.15]}>
                <boxGeometry args={[DOOR_OPENING + 0.9, 0.1, DOOR_REVEAL + 0.3]} />
                <meshStandardMaterial color="#b9b2a3" roughness={0.9} transparent={seeThrough} opacity={opacity} />
            </mesh>

            {/* A gas lantern either side of the door */}
            {[-1, 1].map(side => (
                <group key={side} position={[side * (radius + 0.75), 2.2, 0.08]}>
                    <mesh position={[0, 0, 0.05]}>
                        <boxGeometry args={[0.05, 0.05, 0.12]} />
                        <meshStandardMaterial color="#1f1f23" roughness={0.5} metalness={0.5} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                    <mesh position={[0, 0.02, 0.16]}>
                        <boxGeometry args={[0.14, 0.26, 0.14]} />
                        <meshStandardMaterial color="#ffe9a8" emissive="#ffd46b" emissiveIntensity={1.2} transparent opacity={0.9} />
                    </mesh>
                    <mesh position={[0, 0.2, 0.16]}>
                        <coneGeometry args={[0.13, 0.12, 4]} />
                        <meshStandardMaterial color="#1f1f23" roughness={0.5} metalness={0.5} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

const WALKWAY_COLOR = '#7a1f1f';
const WALKWAY_TRIM = '#b8892b';

interface WalkwayProps {
    width: number;
    seeThrough: boolean;
}

/** A runner from the main door across the floor between the two halves of the stacks, up to the foot of the stairs. */
export function Walkway({ width, seeThrough }: WalkwayProps) {
    const start = -width / 2 + 0.1;
    const stairs = flightFrame(width);
    const end = stairs.centre - stairs.length / 2 - 0.3;
    const length = end - start;
    const opacity = seeThrough ? 0.7 : 1;

    return (
        <group position={[(start + end) / 2, 0, DOOR_Z]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0, 0.012]} raycast={() => null}>
                <planeGeometry args={[length, WALKWAY_WIDTH]} />
                <meshStandardMaterial color={WALKWAY_TRIM} roughness={0.7} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[0, 0, 0.016]} raycast={() => null}>
                <planeGeometry args={[length - 0.2, WALKWAY_WIDTH - 0.2]} />
                <meshStandardMaterial color={WALKWAY_COLOR} roughness={0.9} transparent={seeThrough} opacity={opacity} />
            </mesh>
        </group>
    );
}

/** The main double door, in the middle of the left wall beside the foot of the stairs. */
export function Doors({ width, seeThrough }: Omit<DoorsProps, 'depth'>) {
    return <VictorianDoor position={[-width / 2, 0, DOOR_Z]} rotationY={Math.PI / 2} seeThrough={seeThrough} />;
}

const COLUMN_COLOR = '#e8e0d0';

const WINDOW_FRAME = 0.08;
const WINDOW_BAR = 0.03;
const SASH_PAINT = '#f6f1e7';
const WINDOW_STONE = '#cfc6b5';

/** Outline of an arch: straight sides from `bottom` up to `straight`, then a round arch on top. */
function archShape(width: number, straight: number, bottom: number): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, bottom);
    shape.lineTo(width / 2, bottom);
    shape.lineTo(width / 2, straight);
    shape.absarc(0, straight, width / 2, 0, Math.PI, false);
    shape.lineTo(-width / 2, bottom);
    return shape;
}

interface WindowPaneProps {
    position: [number, number, number];
    rotationY: number;
    seeThrough: boolean;
}

/**
 * A Victorian sash window: tall and square-headed, two sashes with two panes across and two down each, a stone lintel
 * with a keystone, and a projecting stone sill.
 */
function WindowPane({ position, rotationY, seeThrough }: WindowPaneProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const innerWidth = WINDOW_WIDTH - WINDOW_FRAME * 2;
    const innerHeight = WINDOW_HEIGHT - WINDOW_FRAME * 2;
    const paint = <meshStandardMaterial color={SASH_PAINT} roughness={0.5} transparent={seeThrough} opacity={opacity} />;
    const stone = <meshStandardMaterial color={WINDOW_STONE} roughness={0.85} transparent={seeThrough} opacity={opacity} />;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <group position={[0, WINDOW_SILL, 0]}>
                <mesh position={[0, WINDOW_HEIGHT / 2, 0.03]}>
                    <planeGeometry args={[innerWidth, innerHeight]} />
                    <meshStandardMaterial color="#cfe8f7" emissive="#bfe0f5" emissiveIntensity={0.5} transparent opacity={0.7} />
                </mesh>
                {/* Frame */}
                {[-1, 1].map(side => (
                    <mesh key={side} position={[side * (WINDOW_WIDTH / 2 - WINDOW_FRAME / 2), WINDOW_HEIGHT / 2, 0.05]}>
                        <boxGeometry args={[WINDOW_FRAME, WINDOW_HEIGHT, 0.1]} />
                        {paint}
                    </mesh>
                ))}
                {[WINDOW_FRAME / 2, WINDOW_HEIGHT - WINDOW_FRAME / 2].map(y => (
                    <mesh key={y} position={[0, y, 0.05]}>
                        <boxGeometry args={[WINDOW_WIDTH, WINDOW_FRAME, 0.1]} />
                        {paint}
                    </mesh>
                ))}
                {/* Meeting rail between the two sashes, then the glazing bars: one down the middle, one across each sash */}
                <mesh position={[0, WINDOW_HEIGHT / 2, 0.06]}>
                    <boxGeometry args={[innerWidth, 0.07, 0.12]} />
                    {paint}
                </mesh>
                <mesh position={[0, WINDOW_HEIGHT / 2, 0.05]}>
                    <boxGeometry args={[WINDOW_BAR, innerHeight, 0.06]} />
                    {paint}
                </mesh>
                {[WINDOW_HEIGHT * 0.25, WINDOW_HEIGHT * 0.75].map(y => (
                    <mesh key={y} position={[0, y, 0.05]}>
                        <boxGeometry args={[innerWidth, WINDOW_BAR, 0.06]} />
                        {paint}
                    </mesh>
                ))}
                {/* Stone lintel with a keystone, and the sill */}
                <mesh position={[0, WINDOW_HEIGHT + 0.14, 0.08]}>
                    <boxGeometry args={[WINDOW_WIDTH + 0.5, 0.28, 0.16]} />
                    {stone}
                </mesh>
                <mesh position={[0, WINDOW_HEIGHT + 0.18, 0.1]}>
                    <boxGeometry args={[0.24, 0.4, 0.18]} />
                    {stone}
                </mesh>
                <mesh position={[0, -0.04, 0.12]}>
                    <boxGeometry args={[WINDOW_WIDTH + 0.4, 0.08, 0.24]} />
                    {stone}
                </mesh>
                {[-1, 1].map(side => (
                    <FlowerVase
                        key={side}
                        position={[side * 0.38, 0, 0.17]}
                        seed={`sill${position[0]}${position[2]}${side}`}
                        scale={0.8}
                        seeThrough={seeThrough}
                    />
                ))}
            </group>
        </group>
    );
}

/** Windows along the back wall and the right wall; the left wall belongs to the door and the stairs. */
export function Windows({ width, depth, seeThrough }: DoorsProps) {
    const backXs = backWindowXs(width);

    return (
        <group>
            {backXs.map(x => (
                <WindowPane key={`back-${x}`} position={[x, 0, -depth / 2]} rotationY={0} seeThrough={seeThrough} />
            ))}
            {[-depth / 4, depth / 4].map(z => (
                <WindowPane key={`right-${z}`} position={[width / 2, 0, z]} rotationY={-Math.PI / 2} seeThrough={seeThrough} />
            ))}
        </group>
    );
}

/** Reading tables in the strip in front of the shelves, between the columns. */
export function Tables({ width, depth, seeThrough }: DoorsProps) {
    return <TableSet xs={tableXs(width)} depth={depth} seeThrough={seeThrough} />;
}

interface TableSetProps {
    /** Middle of each table along x. */
    xs: number[];
    depth: number;
    seeThrough: boolean;
}

/** Reading tables, each with a chair on either side. */
export function TableSet({ xs: centres, depth, seeThrough }: TableSetProps) {
    const z = tableZ(depth);
    const opacity = seeThrough ? 0.7 : 1;

    return (
        <group>
            {centres.map(x => (
                <group key={x} position={[x, 0, z]}>
                    <FlowerVase position={[0, TABLE_HEIGHT, 0]} seed={`table${x}${hash01(String(x))}`} scale={0.9} seeThrough={seeThrough} />
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
export function LibrarianDesk({ width, depth, seeThrough }: DoorsProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const { x, z } = deskPosition(width, depth);

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
            <FlowerVase position={[0.05, DESK_HEIGHT, 0.12]} seed="desk" seeThrough={seeThrough} />
            <Chair position={[0, 0, -0.75]} rotationY={0} color="#3f3f46" seeThrough={seeThrough} />
        </group>
    );
}

interface ColumnsProps {
    width: number;
    depth: number;
    height: number;
    seeThrough: boolean;
    /** Column positions along x; defaults to an even spread across the floor. */
    xs?: number[];
}

/** A row of round columns along the open front edge, stopping short of the stair strip. */
export function Columns({ width, depth, height, seeThrough, xs }: ColumnsProps) {
    const z = COLUMN_Z(depth);
    const material = (
        <meshStandardMaterial color={COLUMN_COLOR} roughness={0.6} transparent={seeThrough} opacity={seeThrough ? 0.55 : 1} />
    );

    return (
        <group>
            {(xs ?? columnXs(width)).map((x, i) => {
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

/** One solid, wide flight across the middle of the floor, climbing to a landing at the far end. */
export function Stairs({ width, storey, direction, hasFloorAbove }: Omit<StairsProps, 'depth'>) {
    const { count, rise, run } = stairGeometry(storey);
    const { length: flight, centre } = flightFrame(width);
    const startX = centre - direction * (flight / 2 - STAIR_EDGE);
    const landingHeight = hasFloorAbove ? storey - SLAB_THICKNESS : storey;

    return (
        <group>
            {Array.from({ length: count }, (_, k) => {
                const height = (k + 1) * rise;
                return (
                    <mesh key={k} position={[startX + direction * (k + 0.5) * run, height / 2, 0]}>
                        <boxGeometry args={[run, height, STAIR_WIDTH]} />
                        <meshStandardMaterial color={STAIR_COLOR} roughness={0.85} />
                    </mesh>
                );
            })}
            <mesh position={[centre + direction * (flight / 2 - STAIR_LANDING / 2), landingHeight / 2, 0]}>
                <boxGeometry args={[STAIR_LANDING, landingHeight, STAIR_WIDTH]} />
                <meshStandardMaterial color={STAIR_COLOR} roughness={0.85} />
            </mesh>
        </group>
    );
}
