import * as THREE from 'three';
import { hash01 } from '../../lib/libraryLayout.ts';
import { FlowerVase } from './Decor.tsx';
import {
    CHAIR_OFFSET,
    COLUMN_RADIUS,
    DESK_DEPTH,
    DESK_HEIGHT,
    DESK_LENGTH,
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
    columnPositions,
    deskPosition,
    doorPositions,
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

/** Width of the gap a door leaves in a wall's panelling. */
const DOOR_GAP = 2.8;

/** Splits the stretch [from, to] of a wall around a door centred at `gapCentre`, dropping slivers too small to panel. */
function splitAround(from: number, to: number, gapCentre?: number): [number, number][] {
    if (gapCentre === undefined) return [[from, to]];
    const runs: [number, number][] = [
        [from, gapCentre - DOOR_GAP / 2],
        [gapCentre + DOOR_GAP / 2, to],
    ];
    return runs.filter(([a, b]) => b - a > 0.3);
}

interface WallsProps {
    /** Length of the north and south walls: the whole building across. */
    width: number;
    /** Length of the west and east walls. */
    depth: number;
    height: number;
    seeThrough: boolean;
    /** X of the north and south doors along those walls, measured from their middle (0: the cross is in the middle); absent where there are no doors. */
    doorX?: number;
    /** Whether the main door stands in the middle of the west wall. */
    hasWestDoor?: boolean;
}

/**
 * The four walls with wooden panelling at their foot. The south (front) wall is glass-clear so the camera can still look in
 * through it; it has its door and its panelling like the others.
 */
export function Walls({ width, depth, height, seeThrough, doorX, hasWestDoor = false }: WallsProps) {
    const solid = [
        { key: 'back', position: [0, height / 2, -depth / 2 - WALL_THICKNESS / 2], size: [width + WALL_THICKNESS * 2, height, WALL_THICKNESS] },
        { key: 'left', position: [-width / 2 - WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
        { key: 'right', position: [width / 2 + WALL_THICKNESS / 2, height / 2, 0], size: [WALL_THICKNESS, height, depth] },
    ] as const;

    const northSouthRuns = splitAround(-width / 2, width / 2, doorX);
    const westRuns = splitAround(-depth / 2, depth / 2, hasWestDoor ? 0 : undefined);

    return (
        <group>
            {solid.map(wall => (
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
            <mesh position={[0, height / 2, depth / 2 + WALL_THICKNESS / 2]} raycast={() => null}>
                <boxGeometry args={[width + WALL_THICKNESS * 2, height, WALL_THICKNESS]} />
                <meshStandardMaterial color={WALL_COLOR} roughness={0.9} transparent opacity={0.12} depthWrite={false} />
            </mesh>

            {northSouthRuns.map(([from, to]) => (
                <group key={`back-${from}`} position={[(from + to) / 2, 0, -depth / 2]}>
                    <Wainscot length={to - from} seeThrough={seeThrough} />
                </group>
            ))}
            {northSouthRuns.map(([from, to]) => (
                <group key={`front-${from}`} position={[(from + to) / 2, 0, depth / 2]} rotation={[0, Math.PI, 0]}>
                    <Wainscot length={to - from} seeThrough={seeThrough} />
                </group>
            ))}
            <group position={[width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <Wainscot length={depth} seeThrough={seeThrough} />
            </group>
            {westRuns.map(([from, to]) => (
                <group key={`west-${from}`} position={[-width / 2, 0, (from + to) / 2]} rotation={[0, Math.PI / 2, 0]}>
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

const CARPET_COLOR = '#7a1f1f';
const CARPET_TRIM = '#b8892b';

interface CarpetsProps {
    hall: number;
    storey: number;
    seeThrough: boolean;
}

/**
 * The cross of carpet through the middle of the hall: one arm runs from the main door in the west wall to the foot of the
 * stairs, the other from the north door to the south door, crossing in the middle.
 */
export function Carpets({ hall, storey, seeThrough }: CarpetsProps) {
    const stairs = flightFrame(hall, storey);
    const west = -hall / 2 + 0.1;
    const east = stairs.start - 0.3;
    const north = -hall / 2 + 0.1;
    const south = hall / 2 - 0.1;
    const opacity = seeThrough ? 0.7 : 1;

    // [middle x, middle z, length, turned a quarter]: the arms along x and along z.
    const arms = [
        { key: 'west-east', x: (west + east) / 2, z: 0, length: east - west, turn: 0 },
        { key: 'north-south', x: 0, z: (north + south) / 2, length: south - north, turn: Math.PI / 2 },
    ];

    // All the gold edges first, then the red centres on top, so where the arms cross they read as one carpet.
    return (
        <group>
            {arms.map(arm => (
                <group key={`trim-${arm.key}`} position={[arm.x, 0, arm.z]} rotation={[-Math.PI / 2, 0, arm.turn]}>
                    <mesh position={[0, 0, 0.012]} raycast={() => null}>
                        <planeGeometry args={[arm.length, WALKWAY_WIDTH]} />
                        <meshStandardMaterial color={CARPET_TRIM} roughness={0.7} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                </group>
            ))}
            {arms.map(arm => (
                <group key={`field-${arm.key}`} position={[arm.x, 0, arm.z]} rotation={[-Math.PI / 2, 0, arm.turn]}>
                    <mesh position={[0, 0, 0.016]} raycast={() => null}>
                        <planeGeometry args={[arm.length - 0.2, WALKWAY_WIDTH - 0.2]} />
                        <meshStandardMaterial color={CARPET_COLOR} roughness={0.9} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

/** The doors at the ends of the carpet cross: the main double door in the west wall, and one in the north and south walls. */
export function Doors({ hall, seeThrough }: { hall: number; seeThrough: boolean }) {
    const doors = doorPositions(hall);

    return (
        <group>
            <VictorianDoor position={[doors.west.x, 0, doors.west.z]} rotationY={Math.PI / 2} seeThrough={seeThrough} />
            <VictorianDoor position={[doors.north.x, 0, doors.north.z]} rotationY={0} seeThrough={seeThrough} />
            <VictorianDoor position={[doors.south.x, 0, doors.south.z]} rotationY={Math.PI} seeThrough={seeThrough} />
        </group>
    );
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

interface WindowsProps {
    hall: number;
    seeThrough: boolean;
}

/** Windows along the back wall (either side of the north door) and the east wall. */
export function Windows({ hall, seeThrough }: WindowsProps) {
    const east = hall / 2;

    return (
        <group>
            {backWindowXs(hall).map(x => (
                <WindowPane key={`back-${x}`} position={[x, 0, -hall / 2]} rotationY={0} seeThrough={seeThrough} />
            ))}
            {[-hall / 4, hall / 4].map(z => (
                <WindowPane key={`east-${z}`} position={[east, 0, z]} rotationY={-Math.PI / 2} seeThrough={seeThrough} />
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
    /** Where the tables stand along z; the front strip of the hall unless given. */
    z?: number;
    seeThrough: boolean;
}

/** Reading tables, each with a chair on either side. */
export function TableSet({ xs: centres, depth, z: zAt, seeThrough }: TableSetProps) {
    const z = zAt ?? tableZ(depth);
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
export function LibrarianDesk({ width, seeThrough }: Omit<DoorsProps, 'depth'>) {
    const opacity = seeThrough ? 0.7 : 1;
    const { x, z } = deskPosition(width);

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
    hall: number;
    /** Height from this floor up to the next one, which sets how far the flight of stairs reaches and so where the columns stop. */
    storey: number;
    /** Height of each column. */
    height: number;
    seeThrough: boolean;
}

/** Round columns standing in pairs either side of the carpet cross. */
export function Columns({ hall, storey, height, seeThrough }: ColumnsProps) {
    const material = (
        <meshStandardMaterial color={COLUMN_COLOR} roughness={0.6} transparent={seeThrough} opacity={seeThrough ? 0.55 : 1} />
    );

    return (
        <group>
            {columnPositions(hall, storey).map(({ x, z }) => (
                <group key={`${x}:${z}`} position={[x, 0, z]}>
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
            ))}
        </group>
    );
}

interface StairsProps {
    width: number;
    /** Height from this floor up to the next one. */
    storey: number;
    /** True when the next floor is drawn: its slab covers the top landing, so none is drawn here. */
    hasFloorAbove: boolean;
}

const TREAD_COLOR = '#8a5a35';
const RISER_COLOR = '#6f4a2b';
const RAIL_COLOR = '#4e3520';

/**
 * One wide wooden flight along the east arm of the carpet cross, with its foot facing the main door: treads on risers,
 * carried by a stringer down each side (the space under the steps is open), with a handrail either side. Every floor's
 * flight is the same, so they stand directly above each other.
 */
export function Stairs({ width, storey, hasFloorAbove }: StairsProps) {
    const { count, rise, run } = stairGeometry(storey);
    const { start, end } = flightFrame(width, storey);
    const startX = start + STAIR_EDGE;
    const climbed = count * rise;
    const slope = Math.atan2(climbed, count * run);
    const slopeLength = Math.hypot(count * run, climbed);
    const midX = startX + (count * run) / 2;
    const sides = [-1, 1];
    const posts = Array.from({ length: Math.floor(count / 5) + 1 }, (_, i) => Math.min(count - 1, i * 5));

    return (
        <group>
            {Array.from({ length: count }, (_, k) => (
                <group key={k}>
                    <mesh position={[startX + k * run + 0.03, k * rise + rise / 2, 0]}>
                        <boxGeometry args={[0.06, rise, STAIR_WIDTH]} />
                        <meshStandardMaterial color={RISER_COLOR} roughness={0.75} />
                    </mesh>
                    <mesh position={[startX + (k + 0.5) * run, (k + 1) * rise - 0.05, 0]}>
                        <boxGeometry args={[run + 0.04, 0.1, STAIR_WIDTH + 0.06]} />
                        <meshStandardMaterial color={TREAD_COLOR} roughness={0.6} />
                    </mesh>
                </group>
            ))}
            {sides.map(side => (
                <group key={side}>
                    <mesh position={[midX, climbed / 2 - 0.2, side * (STAIR_WIDTH / 2 + 0.02)]} rotation={[0, 0, slope]}>
                        <boxGeometry args={[slopeLength, 0.4, 0.1]} />
                        <meshStandardMaterial color={STAIR_COLOR} roughness={0.8} />
                    </mesh>
                    <mesh position={[midX, climbed / 2 + 0.95, side * (STAIR_WIDTH / 2 + 0.02)]} rotation={[0, 0, slope]}>
                        <boxGeometry args={[slopeLength, 0.07, 0.07]} />
                        <meshStandardMaterial color={RAIL_COLOR} roughness={0.5} />
                    </mesh>
                    {posts.map(k => (
                        <mesh key={k} position={[startX + (k + 0.5) * run, (k + 1) * rise + 0.45, side * (STAIR_WIDTH / 2 + 0.02)]}>
                            <boxGeometry args={[0.05, 0.9, 0.05]} />
                            <meshStandardMaterial color={RAIL_COLOR} roughness={0.5} />
                        </mesh>
                    ))}
                </group>
            ))}
            {!hasFloorAbove && (
                <mesh position={[end - STAIR_LANDING / 2, storey - 0.075, 0]}>
                    <boxGeometry args={[STAIR_LANDING, 0.15, STAIR_WIDTH]} />
                    <meshStandardMaterial color={TREAD_COLOR} roughness={0.6} />
                </mesh>
            )}
        </group>
    );
}
