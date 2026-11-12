import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { hash01 } from '../../lib/libraryLayout.ts';
import { FlowerVase } from './Decor.tsx';
import { InstancedPart, Lozenge, Rosette, ScrollBracket } from './Ornament.tsx';
import { createMarbleTexture } from './marbleTexture.ts';
import {
    ASTRAGAL,
    ATTIC_BASE,
    BALUSTER,
    BRACKET,
    ECHINUS,
    FINIAL,
    FLUTED_SHAFT,
    GILT,
    MAHOGANY,
    MAHOGANY_LIGHT,
    UNIT_BALL,
    UNIT_BOX,
    UNIT_OCTAGON,
    UNIT_ROD,
    VELVET,
    VOLUTE,
    place,
} from './ornamentShapes.ts';
import type { Vec3 } from './ornamentShapes.ts';
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
    colonnades,
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
const DOOR_PAINT = MAHOGANY;
const PANEL_PAINT = MAHOGANY_LIGHT;
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
 * The main entrance: a Victorian double door. Each leaf is a thick mahogany four-panel door (two panels over two), with a
 * gilt lozenge on every panel and brass furniture, under a glazed fanlight in a white surround. Turned columns stand on the
 * surround either side, a keystone with a gilt rosette crowns the arch, and a cornice on carved scroll brackets runs over
 * it all; a stone step and a lantern either side finish it. Set against the inside face of a wall.
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
                    {[0, 1].flatMap(column => panels.map(panel => ({ column, ...panel }))).map(panel => {
                        const x = -leafWidth / 2 + stile + panelWidth / 2 + panel.column * (panelWidth + stile);
                        return (
                            <group key={`${panel.column}-${panel.y}`}>
                                <mesh position={[x, panel.y, LEAF_THICKNESS + 0.02]}>
                                    <boxGeometry args={[panelWidth, panel.height, 0.05]} />
                                    {panelPaint}
                                </mesh>
                                <Lozenge position={[x, panel.y, LEAF_THICKNESS + 0.05]} size={Math.min(panelWidth, panel.height) * 0.55} seeThrough={seeThrough} />
                            </group>
                        );
                    })}
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

            {/* A turned column on the surround either side, from its plinth up to where the arch springs */}
            {[-1, 1].map(side => (
                <group key={`column${side}`} position={[side * (radius + 0.175), 0, DOOR_REVEAL + 0.07]}>
                    <mesh geometry={BALUSTER} position={[0, 0.3, 0]} scale={[2.2, DOOR_STRAIGHT - 0.3, 2.2]}>
                        {paint}
                    </mesh>
                    <mesh position={[0, DOOR_STRAIGHT + 0.04, 0]}>
                        <boxGeometry args={[0.22, 0.08, 0.16]} />
                        {trim}
                    </mesh>
                </group>
            ))}

            {/* Keystone with a gilt rosette at the crown of the arch */}
            <mesh position={[0, DOOR_STRAIGHT + radius + 0.175, DOOR_REVEAL / 2 + 0.03]}>
                <boxGeometry args={[0.32, 0.5, DOOR_REVEAL + 0.06]} />
                {trim}
            </mesh>
            <Rosette position={[0, DOOR_STRAIGHT + radius + 0.175, DOOR_REVEAL + 0.06]} radius={0.1} seeThrough={seeThrough} />

            {/* A cornice over the doorway, carried on a carved scroll bracket at each end */}
            <mesh position={[0, DOOR_STRAIGHT + radius + 0.47, 0.17]}>
                <boxGeometry args={[DOOR_OPENING + 1.3, 0.08, 0.34]} />
                {trim}
            </mesh>
            {[-1, 1].map(side => (
                <ScrollBracket
                    key={`console${side}`}
                    position={[side * (radius + 0.5), DOOR_STRAIGHT + radius + 0.03, 0]}
                    reach={0.3}
                    height={0.4}
                    thickness={0.1}
                    color={TRIM_PAINT}
                    seeThrough={seeThrough}
                />
            ))}

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

const RUBY_GLASS = '#9b2335';
const AMBER_GLASS = '#d99a2b';
const SAPPHIRE_GLASS = '#2f5d8a';
/** Pale, faintly tinted glass for the leaded diamond panes. */
const CATHEDRAL_GLASS = '#f1e7c6';
const LEAD = '#3a3a3a';
/** Polished red granite for the colonettes either side of a window. */
const GRANITE = '#6e3a3a';
const APRON_STONE = '#bfb5a2';
/** Height of the slim bar where the sashes meet the round head. */
const TRANSOM = 0.04;
/** The round head of a window: a half circle as wide as the window, springing from the top of the sashes. */
const ARCH_RADIUS = WINDOW_WIDTH / 2;
/** Width of the stone band round the window, and the radius of the hood moulding over it. */
const SURROUND_WIDTH = 0.18;
const HOOD_RADIUS = ARCH_RADIUS + SURROUND_WIDTH + 0.06;
/** Size of one diamond pane in the leaded upper sash. */
const QUARRY_WIDTH = 0.13;
const QUARRY_HEIGHT = 0.2;
/** The radii in the fanlight: its centre light, the ring of coloured wedges, and the border round them. */
const FAN_HUB = 0.17;
const FAN_WEDGES = 0.44;
const FAN_GLASS = ARCH_RADIUS - WINDOW_FRAME;
const FAN_COLORS = [RUBY_GLASS, SAPPHIRE_GLASS, RUBY_GLASS, SAPPHIRE_GLASS, RUBY_GLASS, SAPPHIRE_GLASS];

const SASH_WIDTH = WINDOW_WIDTH - WINDOW_FRAME * 2;
/** The glass of the sashes, from the bottom rail up to the transom under the round head. */
const SASH_HEIGHT = WINDOW_HEIGHT - WINDOW_FRAME - TRANSOM / 2;
/** The leaded upper sash: the whole width, from the meeting rail up to the transom. */
const quarry = { x0: -SASH_WIDTH / 2, x1: SASH_WIDTH / 2, y0: WINDOW_HEIGHT / 2 + 0.035, y1: WINDOW_HEIGHT - TRANSOM / 2 };

/** The lead cames of a light glazed in diamonds (quarries) filling a rectangle, each as a placed thin bar. */
function quarryCames({ x0, x1, y0, y1 }: typeof quarry) {
    const slope = QUARRY_HEIGHT / QUARRY_WIDTH;
    const run = (y1 - y0) / slope;
    const cames: THREE.Matrix4[] = [];
    for (const dir of [1, -1]) {
        // Each came starts at the bottom edge (extended either side) and climbs at the diamonds' slope, leaning right or left.
        for (let c = x0 - run; c <= x1 + run; c += QUARRY_WIDTH) {
            const t0 = Math.max(0, dir > 0 ? x0 - c : c - x1);
            const t1 = Math.min(run, dir > 0 ? x1 - c : c - x0);
            if (t1 - t0 < 0.01) continue;
            const t = (t0 + t1) / 2;
            const angle = dir > 0 ? Math.atan(slope) : Math.PI - Math.atan(slope);
            cames.push(place([c + dir * t, y0 + slope * t, 0.036], [(t1 - t0) * Math.hypot(1, slope), 0.008, 0.004], [0, 0, angle]));
        }
    }
    return cames;
}
const QUARRY_CAMES = quarryCames(quarry);

// Built once: the painted frame of the round head, and the stone band round the whole window.
let sharedWindowHead: { frame: THREE.ExtrudeGeometry; surround: THREE.ExtrudeGeometry } | null = null;

function windowHeadGeometry() {
    if (!sharedWindowHead) {
        const frame = new THREE.Shape();
        frame.moveTo(ARCH_RADIUS, 0);
        frame.absarc(0, 0, ARCH_RADIUS, 0, Math.PI, false);
        frame.lineTo(-FAN_GLASS, 0);
        frame.absarc(0, 0, FAN_GLASS, Math.PI, 0, true);
        frame.closePath();

        const surround = archShape(WINDOW_WIDTH + SURROUND_WIDTH * 2, WINDOW_HEIGHT, 0);
        surround.holes.push(new THREE.Path(archShape(WINDOW_WIDTH, WINDOW_HEIGHT, 0).getPoints(32)));

        sharedWindowHead = {
            frame: new THREE.ExtrudeGeometry(frame, { depth: 0.1, bevelEnabled: false, curveSegments: 32 }),
            surround: new THREE.ExtrudeGeometry(surround, { depth: 0.06, bevelEnabled: false, curveSegments: 32 }),
        };
    }
    return sharedWindowHead;
}

/**
 * A round-headed Victorian sash window. The lower sash has four clear panes; the upper sash is leaded in pale diamond
 * quarries right across, up to a slim transom; the half-round fanlight above has a ring of ruby and sapphire
 * wedges round a pale centre with a gilt rosette, inside an amber border, all in lead. A stone band runs round the whole
 * window with a keystone and rosette at its crown, under a hood moulding ending in rosettes; polished granite colonettes
 * stand either side, and the stone sill rests on two scroll consoles over a carved apron panel.
 */
function WindowPane({ position, rotationY, seeThrough }: WindowPaneProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const { frame: headFrame, surround } = windowHeadGeometry();
    const paint = <meshStandardMaterial color={SASH_PAINT} roughness={0.5} transparent={seeThrough} opacity={opacity} />;
    const stone = <meshStandardMaterial color={WINDOW_STONE} roughness={0.85} transparent={seeThrough} opacity={opacity} />;
    const lead = <meshStandardMaterial color={LEAD} roughness={0.6} metalness={0.3} transparent={seeThrough} opacity={opacity} />;
    const glass = (color: string, glow = 0.45) => (
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={0.85} />
    );

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <group position={[0, WINDOW_SILL, 0]}>
                {/* Clear glass behind both sashes, and the pale glass of the leaded upper sash */}
                <mesh position={[0, WINDOW_FRAME + SASH_HEIGHT / 2, 0.03]}>
                    <planeGeometry args={[SASH_WIDTH, SASH_HEIGHT]} />
                    <meshStandardMaterial color="#cfe8f7" emissive="#bfe0f5" emissiveIntensity={0.5} transparent opacity={0.7} />
                </mesh>
                <mesh position={[0, (quarry.y0 + quarry.y1) / 2, 0.032]}>
                    <planeGeometry args={[quarry.x1 - quarry.x0, quarry.y1 - quarry.y0]} />
                    {glass(CATHEDRAL_GLASS, 0.35)}
                </mesh>
                <InstancedPart geometry={UNIT_BOX} matrices={QUARRY_CAMES}>
                    {lead}
                </InstancedPart>

                {/* Frame sides and bottom rail, the slim transom under the round head, the meeting rail, and the glazing bars of the lower sash (two panes across, two down) */}
                {[-1, 1].map(side => (
                    <mesh key={side} position={[side * (WINDOW_WIDTH / 2 - WINDOW_FRAME / 2), WINDOW_HEIGHT / 2, 0.05]}>
                        <boxGeometry args={[WINDOW_FRAME, WINDOW_HEIGHT, 0.1]} />
                        {paint}
                    </mesh>
                ))}
                <mesh position={[0, WINDOW_FRAME / 2, 0.05]}>
                    <boxGeometry args={[WINDOW_WIDTH, WINDOW_FRAME, 0.1]} />
                    {paint}
                </mesh>
                <mesh position={[0, WINDOW_HEIGHT, 0.05]}>
                    <boxGeometry args={[SASH_WIDTH, TRANSOM, 0.08]} />
                    {paint}
                </mesh>
                <mesh position={[0, WINDOW_HEIGHT / 2, 0.06]}>
                    <boxGeometry args={[SASH_WIDTH, 0.07, 0.12]} />
                    {paint}
                </mesh>
                <mesh position={[0, (WINDOW_FRAME + WINDOW_HEIGHT / 2) / 2, 0.05]}>
                    <boxGeometry args={[WINDOW_BAR, WINDOW_HEIGHT / 2 - WINDOW_FRAME, 0.06]} />
                    {paint}
                </mesh>
                <mesh position={[0, WINDOW_HEIGHT * 0.27, 0.05]}>
                    <boxGeometry args={[SASH_WIDTH, WINDOW_BAR, 0.06]} />
                    {paint}
                </mesh>

                {/* The fanlight in the round head: pale centre with a rosette, a ring of coloured wedges, an amber border, all in lead */}
                <group position={[0, WINDOW_HEIGHT, 0]}>
                    <mesh geometry={headFrame}>{paint}</mesh>
                    <mesh position={[0, 0, 0.034]}>
                        <circleGeometry args={[FAN_HUB, 16, 0, Math.PI]} />
                        {glass(CATHEDRAL_GLASS, 0.35)}
                    </mesh>
                    {FAN_COLORS.map((color, i) => (
                        <mesh key={i} position={[0, 0, 0.034]}>
                            <ringGeometry args={[FAN_HUB, FAN_WEDGES, 4, 1, (i * Math.PI) / 6, Math.PI / 6]} />
                            {glass(color)}
                        </mesh>
                    ))}
                    <mesh position={[0, 0, 0.034]}>
                        <ringGeometry args={[FAN_WEDGES, FAN_GLASS, 24, 1, 0, Math.PI]} />
                        {glass(AMBER_GLASS)}
                    </mesh>
                    {[FAN_HUB, FAN_WEDGES].map(r => (
                        <mesh key={r} position={[0, 0, 0.037]}>
                            <ringGeometry args={[r - 0.007, r + 0.007, 24, 1, 0, Math.PI]} />
                            {lead}
                        </mesh>
                    ))}
                    {[1, 2, 3, 4, 5].map(i => {
                        const angle = (i * Math.PI) / 6;
                        const r = (FAN_HUB + FAN_GLASS) / 2;
                        return (
                            <mesh key={i} position={[Math.cos(angle) * r, Math.sin(angle) * r, 0.037]} rotation={[0, 0, angle]}>
                                <boxGeometry args={[FAN_GLASS - FAN_HUB, 0.012, 0.004]} />
                                {lead}
                            </mesh>
                        );
                    })}
                    <Rosette position={[0, 0.07, 0.036]} radius={0.05} seeThrough={seeThrough} />
                </group>

                {/* Stone band round the window, keystone and rosette at its crown, and the hood moulding with a rosette at each end */}
                <mesh geometry={surround}>{stone}</mesh>
                <mesh position={[0, WINDOW_HEIGHT + ARCH_RADIUS + SURROUND_WIDTH / 2, 0.05]}>
                    <boxGeometry args={[0.2, 0.3, 0.1]} />
                    {stone}
                </mesh>
                <Rosette position={[0, WINDOW_HEIGHT + ARCH_RADIUS + SURROUND_WIDTH / 2, 0.1]} radius={0.06} seeThrough={seeThrough} />
                <mesh position={[0, WINDOW_HEIGHT, 0.04]}>
                    <torusGeometry args={[HOOD_RADIUS, 0.03, 6, 40, Math.PI]} />
                    {stone}
                </mesh>
                {[-1, 1].map(side => (
                    <Rosette key={`stop${side}`} position={[side * HOOD_RADIUS, WINDOW_HEIGHT - 0.03, 0.07]} radius={0.045} seeThrough={seeThrough} />
                ))}

                {/* A polished granite colonette on the band either side, from a small base up to a capital where the arch springs */}
                {[-1, 1].map(side => (
                    <group key={`colonette${side}`} position={[side * (WINDOW_WIDTH / 2 + SURROUND_WIDTH / 2), 0, 0.11]}>
                        <mesh position={[0, 0.02, 0]}>
                            <boxGeometry args={[0.12, 0.04, 0.12]} />
                            {stone}
                        </mesh>
                        <mesh geometry={BALUSTER} position={[0, 0.04, 0]} scale={[1.6, WINDOW_HEIGHT - 0.1, 1.6]}>
                            <meshStandardMaterial color={GRANITE} roughness={0.25} transparent={seeThrough} opacity={opacity} />
                        </mesh>
                        <mesh position={[0, WINDOW_HEIGHT - 0.03, 0]}>
                            <boxGeometry args={[0.15, 0.06, 0.13]} />
                            {stone}
                        </mesh>
                    </group>
                ))}

                {/* The sill on a scroll console at each end, over a sunk apron panel carved with a rosette and two lozenges */}
                <mesh position={[0, -0.04, 0.12]}>
                    <boxGeometry args={[WINDOW_WIDTH + 0.4, 0.08, 0.24]} />
                    {stone}
                </mesh>
                {[-1, 1].map(side => (
                    <ScrollBracket
                        key={`sill${side}`}
                        position={[side * (WINDOW_WIDTH / 2 + 0.08), -0.4, 0]}
                        reach={0.22}
                        height={0.32}
                        thickness={0.07}
                        color={WINDOW_STONE}
                        seeThrough={seeThrough}
                    />
                ))}
                <mesh position={[0, -0.23, 0.015]}>
                    <boxGeometry args={[WINDOW_WIDTH - 0.1, 0.26, 0.03]} />
                    <meshStandardMaterial color={APRON_STONE} roughness={0.85} transparent={seeThrough} opacity={opacity} />
                </mesh>
                <Rosette position={[0, -0.23, 0.03]} radius={0.05} seeThrough={seeThrough} />
                {[-1, 1].map(side => (
                    <Lozenge key={`apron${side}`} position={[side * 0.3, -0.23, 0.03]} size={0.09} seeThrough={seeThrough} />
                ))}

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
                            upholstery={VELVET}
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
    /** Colour of the seat's upholstery. */
    upholstery: string;
    seeThrough: boolean;
}

const SEAT = 0.44;
const SEAT_HEIGHT = 0.45;
/** Height of the top of the back, finials not counted. */
const BACK_TOP = SEAT_HEIGHT + 0.47;
const LEATHER_GREEN = '#2f5d3a';

/**
 * A Victorian mahogany chair: turned front legs, back legs rising into stiles topped with acorns, a crest rail with a gilt
 * lozenge over a pierced splat of two scrolls back to back, and an upholstered seat with gold piping.
 */
function Chair({ position, rotationY, upholstery, seeThrough }: ChairProps) {
    const opacity = seeThrough ? 0.7 : 1;
    const wood = <meshStandardMaterial color={MAHOGANY} roughness={0.4} transparent={seeThrough} opacity={opacity} />;
    const leg = SEAT / 2 - 0.03;
    const splatBottom = SEAT_HEIGHT + 0.135;
    const splatTop = BACK_TOP - 0.09;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Seat rail, gold piping, then the upholstered seat */}
            <mesh position={[0, SEAT_HEIGHT - 0.025, 0]}>
                <boxGeometry args={[SEAT, 0.05, SEAT]} />
                {wood}
            </mesh>
            <mesh position={[0, SEAT_HEIGHT + 0.006, 0.005]}>
                <boxGeometry args={[SEAT - 0.02, 0.012, SEAT - 0.03]} />
                <meshStandardMaterial color={CARPET_TRIM} roughness={0.5} metalness={0.4} transparent={seeThrough} opacity={opacity} />
            </mesh>
            <mesh position={[0, SEAT_HEIGHT + 0.036, 0.008]}>
                <boxGeometry args={[SEAT - 0.04, 0.05, SEAT - 0.06]} />
                <meshStandardMaterial color={upholstery} roughness={0.9} transparent={seeThrough} opacity={opacity} />
            </mesh>
            {[-1, 1].map(sx => (
                <group key={sx}>
                    {/* A turned front leg */}
                    <mesh geometry={BALUSTER} position={[sx * leg, 0, leg]} scale={[1.1, SEAT_HEIGHT - 0.05, 1.1]}>
                        {wood}
                    </mesh>
                    {/* A back leg rising into a stile, with an acorn on top */}
                    <mesh position={[sx * leg, BACK_TOP / 2, -leg]}>
                        <boxGeometry args={[0.04, BACK_TOP, 0.04]} />
                        {wood}
                    </mesh>
                    <mesh geometry={FINIAL} position={[sx * leg, BACK_TOP, -leg]} scale={0.4}>
                        {wood}
                    </mesh>
                </group>
            ))}
            {/* Crest rail with a gilt lozenge, and a mid rail */}
            <mesh position={[0, BACK_TOP - 0.05, -leg]}>
                <boxGeometry args={[SEAT - 0.04, 0.08, 0.035]} />
                {wood}
            </mesh>
            <Lozenge position={[0, BACK_TOP - 0.05, -leg + 0.018]} size={0.06} seeThrough={seeThrough} />
            <mesh position={[0, SEAT_HEIGHT + 0.12, -leg]}>
                <boxGeometry args={[SEAT - 0.06, 0.03, 0.03]} />
                {wood}
            </mesh>
            {/* The splat between them: two pierced scrolls back to back, curling out from the middle */}
            {[0, Math.PI].map(turn => (
                <mesh
                    key={turn}
                    geometry={BRACKET}
                    position={[0, splatBottom, -leg + (turn ? 0.01 : -0.01)]}
                    rotation={[0, turn, 0]}
                    scale={[0.12, splatTop - splatBottom, 0.02]}
                >
                    {wood}
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
            <Chair position={[0, 0, -0.75]} rotationY={0} upholstery={LEATHER_GREEN} seeThrough={seeThrough} />
        </group>
    );
}

/** The veined marble of the columns, painted once and shared. */
let sharedMarble: THREE.CanvasTexture | null = null;
/** Height of a column from the floor to the top of its capital. */
const COLUMN_HEIGHT = 3.6;
/** Height of the base (plinth and mouldings) and of the capital (bead, echinus, volutes and abacus). */
const BASE_HEIGHT = 0.26;
const CAPITAL_HEIGHT = 0.2;
const SHAFT_TOP = COLUMN_HEIGHT - CAPITAL_HEIGHT;
const EGGS = 16;
/** Size of the gilt acorn on top of each column, against the shared finial shape. */
const FINIAL_SCALE = 1.3;

/**
 * Where every piece of the columns goes, as matrices in the hall, one list per shape and material so each draws in one
 * call. Each column is worked out in the frame of its line (x along the carpet, z towards and away from it), so its
 * volutes face the carpet.
 */
function columnParts(hall: number, storey: number) {
    const parts = {
        marbleBoxes: [] as THREE.Matrix4[],
        bases: [] as THREE.Matrix4[],
        shafts: [] as THREE.Matrix4[],
        astragals: [] as THREE.Matrix4[],
        echini: [] as THREE.Matrix4[],
        eggs: [] as THREE.Matrix4[],
        cushions: [] as THREE.Matrix4[],
        volutes: [] as THREE.Matrix4[],
        voluteEyes: [] as THREE.Matrix4[],
        finials: [] as THREE.Matrix4[],
    };

    for (const line of colonnades(hall, storey)) {
        const frame = place([line.x, 0, line.z], [1, 1, 1], [0, line.alongX ? 0 : Math.PI / 2, 0]);
        const at = (position: Vec3, scale?: Vec3, rotation?: Vec3) => frame.clone().multiply(place(position, scale, rotation));
        const box = (position: Vec3, size: Vec3) => parts.marbleBoxes.push(at(position, size));

        for (const cx of [-line.span / 2, line.span / 2]) {
            // Plinth, Attic base and the fluted shaft.
            box([cx, 0.04, 0], [0.5, 0.08, 0.5]);
            parts.bases.push(at([cx, 0, 0]));
            parts.shafts.push(at([cx, BASE_HEIGHT, 0], [COLUMN_RADIUS, SHAFT_TOP - BASE_HEIGHT, COLUMN_RADIUS]));
            // Ionic capital: a bead, the echinus carved with egg-and-dart, the volutes rolled either side, and the abacus on top.
            parts.astragals.push(at([cx, SHAFT_TOP, 0]));
            parts.echini.push(at([cx, SHAFT_TOP, 0]));
            for (let i = 0; i < EGGS; i++) {
                const egg = (i / EGGS) * Math.PI * 2;
                const dart = egg + Math.PI / EGGS;
                parts.eggs.push(
                    at([cx + Math.cos(egg) * 0.205, SHAFT_TOP + 0.045, Math.sin(egg) * 0.205], [0.026, 0.034, 0.016], [0, Math.PI / 2 - egg, 0]),
                );
                parts.marbleBoxes.push(
                    at([cx + Math.cos(dart) * 0.208, SHAFT_TOP + 0.04, Math.sin(dart) * 0.208], [0.008, 0.05, 0.008], [0, Math.PI / 2 - dart, 0]),
                );
            }
            box([cx, SHAFT_TOP + 0.12, 0], [0.4, 0.06, 0.3]);
            for (const sx of [-1, 1]) {
                const vx = cx + sx * 0.2;
                parts.cushions.push(at([vx, SHAFT_TOP + 0.065, 0], [0.085, 0.3, 0.085], [Math.PI / 2, 0, 0]));
                for (const sz of [-1, 1]) {
                    parts.volutes.push(at([vx, SHAFT_TOP + 0.065, sz * 0.155], [sx * 0.08, 0.08, 0.08]));
                    parts.voluteEyes.push(at([vx, SHAFT_TOP + 0.065, sz * 0.16], [0.014, 0.014, 0.014]));
                }
            }
            box([cx, SHAFT_TOP + 0.175, 0], [0.46, 0.05, 0.46]);
            // A gilt acorn crowns each column, standing on its own.
            parts.finials.push(at([cx, COLUMN_HEIGHT, 0], [FINIAL_SCALE, FINIAL_SCALE, FINIAL_SCALE]));
        }
    }
    return parts;
}

interface ColumnsProps {
    hall: number;
    /** Height from this floor up to the next one, which sets how far the flight of stairs reaches and so which arms have room. */
    storey: number;
    seeThrough: boolean;
}

/**
 * The ground floor's columns beside the carpet cross, each standing on its own, in polished veined marble and the Greek
 * Ionic order: a fluted shaft on an Attic base, a volute capital carved with egg-and-dart, and a gilt acorn on top.
 */
export function Columns({ hall, storey, seeThrough }: ColumnsProps) {
    const parts = useMemo(() => columnParts(hall, storey), [hall, storey]);
    const veins = useMemo(() => (sharedMarble ??= createMarbleTexture()), []);
    const opacity = seeThrough ? 0.55 : 1;
    // Polished white marble with grey veins.
    const marble = <meshStandardMaterial map={veins} roughness={0.22} transparent={seeThrough} opacity={opacity} />;
    const gilt = <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} transparent={seeThrough} opacity={opacity} />;

    return (
        <group>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.marbleBoxes}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={ATTIC_BASE} matrices={parts.bases}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={FLUTED_SHAFT} matrices={parts.shafts}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={ASTRAGAL} matrices={parts.astragals}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={ECHINUS} matrices={parts.echini}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={parts.eggs}>
                {marble}
            </InstancedPart>
            <InstancedPart geometry={UNIT_ROD} matrices={parts.cushions}>
                {marble}
            </InstancedPart>
            {/* The left volutes are mirrored copies, so their faces need drawing from both sides. */}
            <InstancedPart geometry={VOLUTE} matrices={parts.volutes}>
                <meshStandardMaterial map={veins} roughness={0.22} side={THREE.DoubleSide} transparent={seeThrough} opacity={opacity} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={parts.voluteEyes}>
                {gilt}
            </InstancedPart>
            <InstancedPart geometry={FINIAL} matrices={parts.finials}>
                {gilt}
            </InstancedPart>
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

/** Distance from the middle of the flight to the middle of its balustrade: the treads run out past the stringers, and the balusters stand on their ends. */
const BALUSTRADE_Z = STAIR_WIDTH / 2 + 0.05;
/** Outer face of each stringer. */
const STRINGER_FACE = STAIR_WIDTH / 2 + 0.07;
/** How far past the middle of the flight the treads reach on each side. */
const TREAD_HALF = STAIR_WIDTH / 2 + 0.12;
/** Height of the stringer, square to its slope. */
const STRINGER_DEPTH = 0.36;
/** Height of the top of the balusters above the line of the nosings. */
const BALUSTER_REACH = 0.86;
const RAIL_DEPTH = 0.07;
/** Width of the stair runner, gold border included, and of its red field. */
const RUNNER_WIDTH = 1.14;
const RUNNER_FIELD = 1.0;
/** How far in front of the first riser the foot newels stand, and past the last one the top newels stand. */
const NEWEL_SETBACK = 0.15;
const TOP_NEWEL_SETBACK = 0.12;

interface NewelProps {
    position: Vec3;
    /** Height of the middle of the handrail where it meets the post, above the post's foot. */
    railY: number;
}

/** A Victorian newel post: a plinth, a square shaft with a sunk panel and a gilt lozenge on each face, a moulded cap and a turned acorn. */
function Newel({ position, railY }: NewelProps) {
    const baseHeight = 0.18;
    const shaftTop = railY + 0.02;
    const shaftHeight = shaftTop - baseHeight;
    const panelY = baseHeight + shaftHeight / 2;
    const wood = <meshStandardMaterial color={MAHOGANY} roughness={0.35} />;
    const panel = <meshStandardMaterial color={MAHOGANY_LIGHT} roughness={0.45} />;
    const gilt = <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.7} />;
    // The four faces, as the [x, z] of each face's outward direction.
    const faces: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    return (
        <group position={position}>
            <mesh position={[0, baseHeight / 2, 0]}>
                <boxGeometry args={[0.24, baseHeight, 0.24]} />
                {wood}
            </mesh>
            <mesh position={[0, baseHeight + 0.02, 0]}>
                <boxGeometry args={[0.2, 0.04, 0.2]} />
                {wood}
            </mesh>
            <mesh position={[0, panelY, 0]}>
                <boxGeometry args={[0.16, shaftHeight, 0.16]} />
                {wood}
            </mesh>
            {faces.map(([fx, fz]) => (
                <group key={`${fx}${fz}`}>
                    <mesh position={[fx * 0.082, panelY, fz * 0.082]}>
                        <boxGeometry args={[fx ? 0.01 : 0.1, shaftHeight * 0.62, fz ? 0.01 : 0.1]} />
                        {panel}
                    </mesh>
                    <mesh position={[fx * 0.09, panelY, fz * 0.09]} rotation={fx ? [Math.PI / 4, 0, 0] : [0, 0, Math.PI / 4]}>
                        <boxGeometry args={[fx ? 0.008 : 0.05, 0.05, fz ? 0.008 : 0.05]} />
                        {gilt}
                    </mesh>
                </group>
            ))}
            <mesh position={[0, shaftTop + 0.02, 0]}>
                <boxGeometry args={[0.2, 0.04, 0.2]} />
                {wood}
            </mesh>
            <mesh position={[0, shaftTop + 0.07, 0]}>
                <boxGeometry args={[0.25, 0.06, 0.25]} />
                {wood}
            </mesh>
            <mesh position={[0, shaftTop + 0.1, 0]} geometry={FINIAL}>
                {wood}
            </mesh>
        </group>
    );
}

const SPANDREL_THICKNESS = 0.04;
const PANEL_WIDTH = 0.62;
const PANEL_GAP = 0.14;
/** Height of the bottom of the spandrel panels, above the skirting. */
const PANEL_BASE = 0.32;
const SKIRTING = 0.2;

/**
 * The walls that close the space under a flight, one each side (the spandrels): from where the underside of the stringer
 * meets the floor, up under the stringer to the end of the flight, then under the landing to the wall. Drawn in the
 * flight's x-y plane and one thickness deep. Also where their raised panels go: a row of panels standing on the skirting,
 * each as tall as the slope above its lower edge allows.
 */
function spandrelParts(startX: number, end: number, count: number, rise: number, run: number, slope: number) {
    const climbed = count * rise;
    const depth = STRINGER_DEPTH / Math.cos(slope);
    const underside = (x: number) => ((x - startX) * rise) / run - depth;
    const foot = startX + (depth * run) / rise;
    const flightEnd = startX + count * run;
    const landing = climbed - 0.15;

    const shape = new THREE.Shape();
    shape.moveTo(foot, 0);
    shape.lineTo(flightEnd, underside(flightEnd));
    shape.lineTo(flightEnd, landing);
    shape.lineTo(end, landing);
    shape.lineTo(end, 0);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: SPANDREL_THICKNESS, bevelEnabled: false });

    const panels: { x: number; y: number; width: number; height: number }[] = [];
    for (let x = foot + 0.35; x + PANEL_WIDTH <= end - 0.12; x += PANEL_WIDTH + PANEL_GAP) {
        const top = (x < flightEnd ? underside(x) : landing) - 0.22;
        if (top - PANEL_BASE < 0.25) continue;
        panels.push({ x: x + PANEL_WIDTH / 2, y: (PANEL_BASE + top) / 2, width: PANEL_WIDTH, height: top - PANEL_BASE });
    }
    // The skirting starts where the wall is tall enough to take it.
    const skirtingStart = startX + ((SKIRTING + depth) * run) / rise;

    return { geometry, panels, skirtingStart };
}

/** Where every piece of a flight goes, worked out once for a given step count and size. */
function stairParts(count: number, rise: number, run: number, startX: number, slope: number) {
    const sides = [-1, 1];
    const nosingLine = (x: number) => ((x - startX) * rise) / run + rise;
    const stringerDrop = STRINGER_DEPTH / 2 / Math.cos(slope);
    const steps = Array.from({ length: count }, (_, k) => ({ x0: startX + k * run, top: (k + 1) * rise }));
    // The bracket fills the triangle between the riser, the underside of the tread and the top of the string.
    const bracketHeight = Math.max(0.05, rise - 0.1);
    const bracketReach = (bracketHeight * run) / rise;
    const across: Vec3 = [Math.PI / 2, 0, 0];
    const riserRunner = (s: { x0: number; top: number }, inset: number, width: number) =>
        place([s.x0 - inset, s.top - rise + (rise - 0.1) / 2, 0], [0.01, rise - 0.1, width]);
    // A rosette sits on the middle of each stringer face, under the middle of its tread.
    const rosetteAt = (s: { x0: number }, side: number, out: number, scale: Vec3, rotation?: Vec3) => {
        const x = s.x0 + run / 2;
        return place([x, nosingLine(x) - rise - stringerDrop, side * (STRINGER_FACE + out)], scale, rotation);
    };

    return {
        treads: steps.map(s => place([s.x0 + run / 2, s.top - 0.05, 0], [run + 0.04, 0.1, TREAD_HALF * 2])),
        nosings: steps.map(s => place([s.x0 - 0.02, s.top - 0.05, 0], [0.05, TREAD_HALF * 2, 0.05], across)),
        risers: steps.map(s => place([s.x0 + 0.03, s.top - rise / 2, 0], [0.06, rise, STAIR_WIDTH])),
        // A sunk panel on each riser, either side of the runner.
        riserPanels: steps.flatMap(s => sides.map(side => place([s.x0 - 0.005, s.top - rise * 0.55, side * 0.735], [0.01, rise * 0.5, 0.22]))),
        runnerBorder: steps.flatMap(s => [
            place([s.x0 + run / 2, s.top + 0.005, 0], [run, 0.01, RUNNER_WIDTH]),
            riserRunner(s, 0.006, RUNNER_WIDTH),
        ]),
        runnerField: steps.flatMap(s => [
            place([s.x0 + run / 2, s.top + 0.007, 0], [run, 0.01, RUNNER_FIELD]),
            riserRunner(s, 0.008, RUNNER_FIELD),
        ]),
        runnerLozenges: steps.map(s => place([s.x0 + run / 2, s.top + 0.0125, 0], [0.11, 0.004, 0.11], [0, Math.PI / 4, 0])),
        rods: steps.map(s => place([s.x0 + run - 0.035, s.top + 0.022, 0], [0.012, RUNNER_WIDTH + 0.08, 0.012], across)),
        rodKnobs: steps.flatMap(s =>
            sides.map(side => place([s.x0 + run - 0.035, s.top + 0.022, side * (RUNNER_WIDTH / 2 + 0.05)], [0.022, 0.022, 0.022])),
        ),
        brackets: steps.flatMap(s =>
            sides.map(side =>
                place([s.x0, s.top - rise, side > 0 ? STRINGER_FACE + 0.01 : -(STRINGER_FACE + 0.03)], [bracketReach, bracketHeight, 0.02]),
            ),
        ),
        rosettes: steps.flatMap(s => sides.map(side => rosetteAt(s, side, 0.006, [0.045, 0.012, 0.045], across))),
        rosetteBosses: steps.flatMap(s => sides.map(side => rosetteAt(s, side, 0.014, [0.02, 0.02, 0.012]))),
        // Two balusters on each tread, reaching up into the handrail.
        balusters: steps.flatMap(s =>
            [0.28, 0.72].flatMap(at => {
                const x = s.x0 + run * at;
                const height = nosingLine(x) + BALUSTER_REACH - s.top;
                return sides.map(side => place([x, s.top, side * BALUSTRADE_Z], [1, height, 1]));
            }),
        ),
    };
}

/**
 * One wide wooden flight along the east arm of the carpet cross, with its foot facing the main door, built as a Victorian
 * open-string staircase: treads with rounded nosings run out past the stringers, with a carved scroll bracket under each
 * end and a gilt rosette on the string below it; two turned balusters stand on every tread under a moulded mahogany
 * handrail that runs between panelled newel posts at the foot and the top; a red runner with a gold border, a lozenge on
 * every tread and brass stair rods climbs the middle, carrying on the red carpet that leads to it. Every floor's flight
 * is the same, so they stand directly above each other.
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
    /** Height of the middle of the handrail at x: a fixed height above the line through the nosings. */
    const railLine = (x: number) => ((x - startX) * rise) / run + rise + BALUSTER_REACH + RAIL_DEPTH / 2;
    /** Vertical drop from the top edge of a stringer to its middle. */
    const stringerDrop = STRINGER_DEPTH / 2 / Math.cos(slope);
    const stringerY = climbed / 2 - stringerDrop;
    const footX = startX - NEWEL_SETBACK;
    const topX = startX + count * run + TOP_NEWEL_SETBACK;
    const railX = (footX + topX) / 2;
    const railLength = (topX - footX) / Math.cos(slope);

    const parts = useMemo(() => stairParts(count, rise, run, startX, slope), [count, rise, run, startX, slope]);
    const spandrel = useMemo(() => spandrelParts(startX, end, count, rise, run, slope), [startX, end, count, rise, run, slope]);
    useEffect(() => () => spandrel.geometry.dispose(), [spandrel]);
    // The raised panels on the outer face of each spandrel: a dark frame, a lighter field, and a gilt lozenge in the middle.
    const panelling = useMemo(() => {
        const face = STAIR_WIDTH / 2 + SPANDREL_THICKNESS / 2;
        const frames: THREE.Matrix4[] = [];
        const fields: THREE.Matrix4[] = [];
        const lozenges: THREE.Matrix4[] = [];
        for (const side of sides) {
            for (const p of spandrel.panels) {
                frames.push(place([p.x, p.y, side * (face + 0.006)], [p.width + 0.06, p.height + 0.06, 0.012]));
                fields.push(place([p.x, p.y, side * (face + 0.014)], [p.width, p.height, 0.02]));
                lozenges.push(place([p.x, p.y, side * (face + 0.026)], [0.05, 0.05, 0.006], [0, 0, Math.PI / 4]));
            }
            const length = end - spandrel.skirtingStart;
            frames.push(place([spandrel.skirtingStart + length / 2, SKIRTING / 2, side * (face + 0.015)], [length, SKIRTING, 0.03]));
        }
        return { frames, fields, lozenges };
        // `sides` never changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spandrel, end]);

    return (
        <group>
            {/* The spandrels: panelled walls closing the space under the flight on both sides, just inside the stringers */}
            {sides.map(side => (
                <mesh
                    key={`spandrel${side}`}
                    geometry={spandrel.geometry}
                    position={[0, 0, side * (STAIR_WIDTH / 2) - SPANDREL_THICKNESS / 2]}
                >
                    <meshStandardMaterial color={WOOD_MID} roughness={0.7} />
                </mesh>
            ))}
            <InstancedPart geometry={UNIT_BOX} matrices={panelling.frames}>
                <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={panelling.fields}>
                <meshStandardMaterial color={WOOD_PANEL} roughness={0.55} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={panelling.lozenges}>
                <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.treads}>
                <meshStandardMaterial color={TREAD_COLOR} roughness={0.55} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_ROD} matrices={parts.nosings}>
                <meshStandardMaterial color={TREAD_COLOR} roughness={0.55} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.risers}>
                <meshStandardMaterial color={RISER_COLOR} roughness={0.75} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.riserPanels}>
                <meshStandardMaterial color={WOOD_PANEL} roughness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.runnerBorder}>
                <meshStandardMaterial color={CARPET_TRIM} roughness={0.7} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.runnerField}>
                <meshStandardMaterial color={CARPET_COLOR} roughness={0.9} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.runnerLozenges}>
                <meshStandardMaterial color={CARPET_TRIM} roughness={0.7} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_ROD} matrices={parts.rods}>
                <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.8} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={parts.rodKnobs}>
                <meshStandardMaterial color={BRASS} roughness={0.25} metalness={0.8} />
            </InstancedPart>
            <InstancedPart geometry={BRACKET} matrices={parts.brackets}>
                <meshStandardMaterial color={WOOD_MID} roughness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_OCTAGON} matrices={parts.rosettes}>
                <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={parts.rosetteBosses}>
                <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
            </InstancedPart>
            <InstancedPart geometry={BALUSTER} matrices={parts.balusters}>
                <meshStandardMaterial color={MAHOGANY} roughness={0.4} />
            </InstancedPart>
            {sides.map(side => (
                <group key={side}>
                    {/* The stringer, its top edge along the line of the risers' feet, with a moulding along each edge and a panel band down its face. */}
                    <mesh position={[midX, stringerY, side * (STAIR_WIDTH / 2 + 0.02)]} rotation={[0, 0, slope]}>
                        <boxGeometry args={[slopeLength, STRINGER_DEPTH, 0.1]} />
                        <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                    </mesh>
                    {[climbed / 2, climbed / 2 - 2 * stringerDrop].map(y => (
                        <mesh key={y} position={[midX, y, side * STRINGER_FACE]} rotation={[0, 0, slope - Math.PI / 2]}>
                            <cylinderGeometry args={[0.022, 0.022, slopeLength, 10]} />
                            <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
                        </mesh>
                    ))}
                    <mesh position={[midX, stringerY, side * (STRINGER_FACE + 0.003)]} rotation={[0, 0, slope]}>
                        <boxGeometry args={[slopeLength, STRINGER_DEPTH * 0.4, 0.006]} />
                        <meshStandardMaterial color={WOOD_PANEL} roughness={0.6} />
                    </mesh>
                    {/* The handrail: a mahogany rail with a rounded top, from the foot newel to the top newel. */}
                    <mesh position={[railX, railLine(railX), side * BALUSTRADE_Z]} rotation={[0, 0, slope]}>
                        <boxGeometry args={[railLength, RAIL_DEPTH, 0.08]} />
                        <meshStandardMaterial color={MAHOGANY} roughness={0.3} />
                    </mesh>
                    <mesh position={[railX, railLine(railX) + RAIL_DEPTH / 2, side * BALUSTRADE_Z]} rotation={[0, 0, slope - Math.PI / 2]}>
                        <cylinderGeometry args={[0.042, 0.042, railLength, 14]} />
                        <meshStandardMaterial color={MAHOGANY} roughness={0.3} />
                    </mesh>
                    <Newel position={[footX, 0, side * BALUSTRADE_Z]} railY={railLine(footX)} />
                    <Newel position={[topX, climbed, side * BALUSTRADE_Z]} railY={railLine(topX) - climbed} />
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
