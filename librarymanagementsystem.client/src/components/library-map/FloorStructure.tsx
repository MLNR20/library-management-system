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
    WINDOW_SILL,
    WINDOW_SURROUND,
    WINDOW_WIDTH,
    colonnades,
    deskPosition,
    doorPositions,
    STAIR_WIDTH,
    flightFrame,
    stairGeometry,
    tableXs,
    tableZ,
    wallWindows,
    windowStraight,
} from './floorPlan.ts';
import { STONE_TILE_HEIGHT, STONE_TILE_WIDTH, createStoneTexture } from './stoneTexture.ts';

const WALL_THICKNESS = 0.15;
/** The warm cream of the limestone walls, where they are not painted with blocks. */
const WALL_COLOR = '#d6c8a8';
/** Smooth dressed stone, a little paler than the walls: the entablature, and the bands and sills of the windows. */
const DRESSED_STONE = '#e2d6ba';
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

/** The limestone of the walls, painted once and shared; each face gets its own copy so the blocks keep their size on it. */
let sharedStone: THREE.CanvasTexture | null = null;

/** The coursed stone for a face `length` long and `height` tall. */
function useStone(length: number, height: number): THREE.Texture {
    const texture = useMemo(() => {
        sharedStone ??= createStoneTexture();
        const copy = sharedStone.clone();
        copy.repeat.set(length / STONE_TILE_WIDTH, height / STONE_TILE_HEIGHT);
        copy.needsUpdate = true;
        return copy;
    }, [length, height]);

    useEffect(() => () => texture.dispose(), [texture]);
    return texture;
}

// BoxGeometry faces, in order: +x, -x, top, bottom, +z, -z.
const BOX_FACES = [0, 1, 2, 3, 4, 5];

interface StoneWallProps {
    position: readonly [number, number, number];
    size: readonly [number, number, number];
    seeThrough: boolean;
}

/** One solid wall of coursed limestone blocks. Only its two long faces show the blocks; its thin edges are plain stone. */
function StoneWall({ position, size, seeThrough }: StoneWallProps) {
    const alongX = size[0] > size[2];
    const stone = useStone(alongX ? size[0] : size[2], size[1]);
    const longFaces = alongX ? [4, 5] : [0, 1];

    return (
        <mesh position={[position[0], position[1], position[2]]}>
            <boxGeometry args={[size[0], size[1], size[2]]} />
            {BOX_FACES.map(face => {
                const long = longFaces.includes(face);
                return (
                    <meshStandardMaterial
                        key={face}
                        attach={`material-${face}`}
                        map={long ? stone : null}
                        color={long ? '#ffffff' : WALL_COLOR}
                        roughness={0.9}
                        transparent={seeThrough}
                        opacity={seeThrough ? 0.3 : 1}
                        depthWrite={!seeThrough}
                    />
                );
            })}
        </mesh>
    );
}

/** Distance from one dentil to the next, and from one gilt rosette on the frieze to the next. */
const DENTIL_PITCH = 0.2;
const FRIEZE_ROSETTE_PITCH = 2;

/**
 * Where every piece of the entablature goes, along the top of the back, east and west walls. From the top down: the
 * cornice, its bed moulding, a row of dentils, a gilt fillet, the frieze with a gilt rosette every so often, and the
 * architrave in two bands. Worked out in each wall's own frame: x along the wall, z out into the hall.
 */
function entablatureParts(width: number, depth: number, height: number) {
    const stone: THREE.Matrix4[] = [];
    const gilt: THREE.Matrix4[] = [];
    const rosettes: THREE.Matrix4[] = [];
    const walls = [
        { frame: place([0, 0, -depth / 2]), length: width },
        { frame: place([width / 2, 0, 0], [1, 1, 1], [0, -Math.PI / 2, 0]), length: depth },
        { frame: place([-width / 2, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]), length: depth },
    ];

    for (const { frame, length } of walls) {
        const at = (position: Vec3, scale: Vec3, rotation?: Vec3) => frame.clone().multiply(place(position, scale, rotation));
        // A band along the whole wall: from `drop` below the top of the wall, `tall` high, standing `out` from the wall.
        const band = (drop: number, tall: number, out: number) => at([0, height - drop - tall / 2, out / 2], [length, tall, out]);

        stone.push(band(0, 0.12, 0.32), band(0.12, 0.1, 0.22), band(0.22, 0.14, 0.1), band(0.4, 0.44, 0.05), band(0.84, 0.12, 0.09), band(0.96, 0.08, 0.06));
        for (let x = -length / 2 + DENTIL_PITCH / 2; x < length / 2; x += DENTIL_PITCH) {
            stone.push(at([x, height - 0.29, 0.14], [0.1, 0.12, 0.08]));
        }
        gilt.push(band(0.36, 0.04, 0.12));
        const count = Math.max(1, Math.round(length / FRIEZE_ROSETTE_PITCH));
        for (let i = 0; i < count; i++) {
            const x = -length / 2 + ((i + 0.5) * length) / count;
            rosettes.push(at([x, height - 0.62, 0.062], [0.1, 0.024, 0.1], [Math.PI / 2, 0, 0]));
        }
    }
    return { stone, gilt, rosettes };
}

/** The stone entablature that crowns the back, east and west walls, under the floor above. */
function Entablature({ width, depth, height, seeThrough }: Omit<WallsProps, 'doorX' | 'hasWestDoor'>) {
    const parts = useMemo(() => entablatureParts(width, depth, height), [width, depth, height]);
    const opacity = seeThrough ? 0.7 : 1;
    const gilt = <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} transparent={seeThrough} opacity={opacity} />;

    return (
        <group>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.stone}>
                <meshStandardMaterial color={DRESSED_STONE} roughness={0.8} transparent={seeThrough} opacity={opacity} />
            </InstancedPart>
            <InstancedPart geometry={UNIT_BOX} matrices={parts.gilt}>
                {gilt}
            </InstancedPart>
            <InstancedPart geometry={UNIT_OCTAGON} matrices={parts.rosettes}>
                {gilt}
            </InstancedPart>
        </group>
    );
}

/**
 * The four walls: coursed limestone under a stone entablature, with wooden panelling at their foot. The south (front) wall
 * is glass-clear so the camera can still look in through it; it has its door and its panelling like the others.
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
                <StoneWall key={wall.key} position={wall.position} size={wall.size} seeThrough={seeThrough} />
            ))}
            <mesh position={[0, height / 2, depth / 2 + WALL_THICKNESS / 2]} raycast={() => null}>
                <boxGeometry args={[width + WALL_THICKNESS * 2, height, WALL_THICKNESS]} />
                <meshStandardMaterial color={WALL_COLOR} roughness={0.9} transparent opacity={0.12} depthWrite={false} />
            </mesh>
            <Entablature width={width} depth={depth} height={height} seeThrough={seeThrough} />

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
/** The pale marble band set in the tiled floor either side of the carpet, and how far it shows past the carpet's edge. */
const FLOOR_MARBLE = '#e9e2d3';
const MARBLE_BORDER = 0.3;

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

    // A band of pale marble set in the tiled floor under each arm first, then all the gold edges, then the red centres on
    // top, so where the arms cross they read as one carpet.
    return (
        <group>
            {arms.map(arm => (
                <group key={`marble-${arm.key}`} position={[arm.x, 0, arm.z]} rotation={[-Math.PI / 2, 0, arm.turn]}>
                    <mesh position={[0, 0, 0.008]} raycast={() => null}>
                        <planeGeometry args={[arm.length, WALKWAY_WIDTH + MARBLE_BORDER * 2]} />
                        <meshStandardMaterial color={FLOOR_MARBLE} roughness={0.3} transparent={seeThrough} opacity={opacity} />
                    </mesh>
                </group>
            ))}
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

/** Outline of a band `band` wide round an arch `width` across, standing on the line of its sill: up one side, over the round head and down the other. */
function archBand(width: number, straight: number, band: number): THREE.Shape {
    const radius = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(radius + band, 0);
    shape.lineTo(radius + band, straight);
    shape.absarc(0, straight, radius + band, 0, Math.PI, false);
    shape.lineTo(-radius - band, 0);
    shape.lineTo(-radius, 0);
    shape.lineTo(-radius, straight);
    shape.absarc(0, straight, radius, Math.PI, 0, true);
    shape.lineTo(radius, 0);
    shape.closePath();
    return shape;
}

/** Dark bronze for the frames and glazing bars of the windows. */
const BRONZE = '#2c2824';
/** Daylight behind the clear glass. */
const DAYLIGHT = '#dcebf5';
/** Stained glass: the pale ground of the rose, and the colours of the petals, the little flowers and the margin lights. */
const PALE_GLASS = new THREE.Color('#f4ecd0');
const RUBY_GLASS = new THREE.Color('#b3263c');
const SAPPHIRE_GLASS = new THREE.Color('#3a70a8');
const AMBER_GLASS = new THREE.Color('#e0a12e');
/** The inner step of a window's stone band, hard against the opening, which stands further out than the rest. */
const ARCH_MOULDING = 0.09;
/** How far the stone band, its inner step and the keystone stand out from the wall; the glass sits back between them. */
const SURROUND_DEPTH = 0.12;
const MOULDING_DEPTH = 0.18;
const KEYSTONE_DEPTH = 0.23;
const GLASS_SETBACK = 0.03;
/** Width of the bronze frame round the glass, and how far it stands in front of it. */
const GLAZING_FRAME = 0.07;
/** Half the width of the glass, inside its frame. */
const GLASS_RADIUS = WINDOW_WIDTH / 2 - GLAZING_FRAME;
/** Width of the narrow margin light of coloured glass down each side of a window. */
const MARGIN_LIGHT = 0.2;
/** The clear glass between the margin lights is six small panes across; the panes are about this tall. */
const PANES_ACROSS = 6;
const PANE_HEIGHT = 0.42;
/** Thickness of a glazing bar, and of the heavier mullions and transom that divide the window into its lights. */
const GLAZING_BAR = 0.024;
const MULLION = 0.055;
/** The rose in the round head: the radius of its ring, how far its middle is above the line the head springs from, and its petals. */
const ROSE_RADIUS = GLASS_RADIUS * 0.38;
const ROSE_RISE = GLASS_RADIUS * 0.5;
const ROSE_PETALS = 8;
/** Radius of the hood moulding over a window, just outside its stone band. */
const HOOD_RADIUS = WINDOW_WIDTH / 2 + WINDOW_SURROUND + 0.05;

// Shared shapes of the glazing, built once and scaled per piece: a round and a square of glass, facing +z.
const UNIT_DISC = new THREE.CircleGeometry(1, 20);
const UNIT_PANE = new THREE.PlaneGeometry(1, 1);

/** A petal of glass: a pointed leaf one unit long up +y from its foot at the origin, and one unit across at its widest. */
function petalGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.6, 0.2, 0.55, 0.75, 0, 1);
    shape.bezierCurveTo(-0.55, 0.75, -0.6, 0.2, 0, 0);
    return new THREE.ShapeGeometry(shape, 10);
}
const PETAL = petalGeometry();
/** The bronze ring of the rose, and the half-round hood moulding over a window. */
const ROSE_RING = new THREE.TorusGeometry(ROSE_RADIUS, 0.024, 6, 40);
const HOOD = new THREE.TorusGeometry(HOOD_RADIUS, 0.035, 6, 40, Math.PI);

/** The shapes every window shares, for windows with straight sides `straight` tall. Drawn from the sill line up, facing +z. */
function windowGeometries(straight: number) {
    const extrude = (shape: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
    return {
        surround: extrude(archBand(WINDOW_WIDTH, straight, WINDOW_SURROUND), SURROUND_DEPTH),
        moulding: extrude(archBand(WINDOW_WIDTH, straight, ARCH_MOULDING), MOULDING_DEPTH),
        frame: extrude(archBand(GLASS_RADIUS * 2, straight, GLAZING_FRAME), GLAZING_FRAME),
        opening: new THREE.ShapeGeometry(archShape(WINDOW_WIDTH, straight, 0), 32),
    };
}

/**
 * The glazing and the gilt of one window, as placed pieces in the window's own frame (x across, y up from the sill, z out
 * from the wall).
 *
 * Under the transom the glass is clear, in small panes: every second upright is a heavier mullion, so the window is
 * three lights of two panes, with a narrow margin light of amber glass down each side (ruby at its top and bottom) and a
 * row of little four-petalled flowers in the panes under the transom. The round head holds a rose: a ring with eight
 * petals of ruby and sapphire glass round an amber eye, and rays fanning out from it to the frame. A gilt rosette sits on
 * the keystone and at each end of the hood moulding.
 */
function windowGlazing(straight: number) {
    const inner = GLASS_RADIUS - MARGIN_LIGHT;
    const paneWidth = (inner * 2) / PANES_ACROSS;
    const rows = Math.max(2, Math.round((straight - GLAZING_FRAME) / PANE_HEIGHT));
    const paneHeight = (straight - GLAZING_FRAME) / rows;
    const barZ = (thickness: number) => GLASS_SETBACK + 0.005 + thickness / 2;
    // The coloured glass lies just in front of the clear glass, in three layers so nothing flickers where pieces overlap.
    const groundZ = GLASS_SETBACK + 0.006;
    const petalZ = groundZ + 0.006;
    const eyeZ = petalZ + 0.006;

    const bars: THREE.Matrix4[] = [];
    const panes: THREE.Matrix4[] = [];
    const paneColors: THREE.Color[] = [];
    const discs: THREE.Matrix4[] = [];
    const discColors: THREE.Color[] = [];
    const petals: THREE.Matrix4[] = [];
    const petalColors: THREE.Color[] = [];
    const disc = (x: number, y: number, z: number, radius: number, color: THREE.Color) => {
        discs.push(place([x, y, z], [radius, radius, 1]));
        discColors.push(color);
    };

    // Uprights from the bottom rail to the transom: one inside each margin light, then those between the panes.
    const uprightHeight = straight - GLAZING_FRAME;
    const uprightY = (straight + GLAZING_FRAME) / 2;
    for (const x of [-inner, inner]) bars.push(place([x, uprightY, barZ(GLAZING_BAR)], [GLAZING_BAR, uprightHeight, GLAZING_BAR]));
    for (let i = 1; i < PANES_ACROSS; i++) {
        const thickness = i % 2 === 0 ? MULLION : GLAZING_BAR;
        bars.push(place([-inner + i * paneWidth, uprightY, barZ(thickness)], [thickness, uprightHeight, thickness]));
    }
    // Rails across at every pane; the last is the transom, where the head springs.
    for (let row = 1; row <= rows; row++) {
        const thickness = row === rows ? MULLION : GLAZING_BAR;
        bars.push(place([0, GLAZING_FRAME + row * paneHeight, barZ(thickness)], [GLASS_RADIUS * 2, thickness, thickness]));
    }

    // Margin lights: amber down each side, ruby at the top and the bottom.
    for (let row = 0; row < rows; row++) {
        const color = row === 0 || row === rows - 1 ? RUBY_GLASS : AMBER_GLASS;
        for (const side of [-1, 1]) {
            panes.push(place([side * (inner + MARGIN_LIGHT / 2), GLAZING_FRAME + (row + 0.5) * paneHeight, groundZ], [MARGIN_LIGHT, paneHeight, 1]));
            paneColors.push(color);
        }
    }

    // A little flower in each pane under the transom: four petals, ruby and sapphire in turn, round an amber eye.
    const flowerY = straight - paneHeight / 2;
    for (let i = 0; i < PANES_ACROSS; i++) {
        const x = -inner + (i + 0.5) * paneWidth;
        const color = i % 2 ? SAPPHIRE_GLASS : RUBY_GLASS;
        for (let petal = 0; petal < 4; petal++) {
            const angle = (petal * Math.PI) / 2;
            disc(x + Math.cos(angle) * 0.08, flowerY + Math.sin(angle) * 0.08, groundZ, 0.065, color);
        }
        disc(x, flowerY, eyeZ, 0.04, AMBER_GLASS);
    }

    // The rose in the round head: a pale round of glass, eight petals and an amber eye.
    const roseY = straight + ROSE_RISE;
    disc(0, roseY, groundZ, ROSE_RADIUS, PALE_GLASS);
    for (let petal = 0; petal < ROSE_PETALS; petal++) {
        const angle = Math.PI / 2 + (petal / ROSE_PETALS) * Math.PI * 2;
        const foot = ROSE_RADIUS * 0.16;
        petals.push(
            place([Math.cos(angle) * foot, roseY + Math.sin(angle) * foot, petalZ], [ROSE_RADIUS * 0.42, ROSE_RADIUS * 0.74, 1], [0, 0, angle - Math.PI / 2]),
        );
        petalColors.push(petal % 2 ? SAPPHIRE_GLASS : RUBY_GLASS);
    }
    disc(0, roseY, eyeZ, ROSE_RADIUS * 0.2, AMBER_GLASS);

    // Rays fan out from the rose, each running until it meets the curve of the head, or the transom below.
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const b = ROSE_RISE * dy;
        const toHead = -b + Math.sqrt(b * b + GLASS_RADIUS ** 2 - ROSE_RISE ** 2);
        const reach = dy < -1e-6 ? Math.min(toHead, ROSE_RISE / -dy) : toHead;
        const length = reach - ROSE_RADIUS;
        if (length < 0.05) continue;
        const middle = ROSE_RADIUS + length / 2;
        bars.push(place([dx * middle, roseY + dy * middle, barZ(GLAZING_BAR)], [length, GLAZING_BAR, GLAZING_BAR], [0, 0, angle]));
    }

    // Gilt rosettes, each an octagonal boss with a domed centre: on the keystone, and at each end of the hood moulding.
    const rosettes: THREE.Matrix4[] = [];
    const bosses: THREE.Matrix4[] = [];
    const rosette = (x: number, y: number, z: number, radius: number) => {
        rosettes.push(place([x, y, z + radius * 0.15], [radius, radius * 0.3, radius], [Math.PI / 2, 0, 0]));
        bosses.push(place([x, y, z + radius * 0.3], [radius * 0.4, radius * 0.4, radius * 0.32]));
    };
    rosette(0, straight + WINDOW_WIDTH / 2 + WINDOW_SURROUND / 2, KEYSTONE_DEPTH, 0.08);
    for (const side of [-1, 1]) rosette(side * HOOD_RADIUS, straight - 0.02, 0.085, 0.065);

    return { bars, panes, paneColors, discs, discColors, petals, petalColors, rosettes, bosses };
}

interface WindowsProps {
    hall: number;
    /** Height of the walls. */
    height: number;
    seeThrough: boolean;
}

/**
 * The tall round-headed windows along the back, east and west walls, after a grand reading room. Each is set in a stepped
 * band of dressed stone with a keystone, under a hood moulding, over a stone sill with a vase of flowers on it. The glass
 * is held in dark bronze bars: small clear panes in three lights between margin lights of coloured glass, a row of little
 * glass flowers under the transom, and a rose of ruby and sapphire petals in the round head.
 */
export function Windows({ hall, height, seeThrough }: WindowsProps) {
    const straight = windowStraight(height);
    const windows = useMemo(() => wallWindows(hall), [hall]);
    const shapes = useMemo(() => windowGeometries(straight), [straight]);
    useEffect(() => () => Object.values(shapes).forEach(shape => shape.dispose()), [shapes]);
    // Every window's bars, coloured glass and gilt, placed in the hall, so each kind draws in one call.
    const glazing = useMemo(() => {
        const one = windowGlazing(straight);
        const frames = windows.map(window => place([window.x, WINDOW_SILL, window.z], [1, 1, 1], [0, window.rotationY, 0]));
        const inHall = (pieces: THREE.Matrix4[]) => frames.flatMap(frame => pieces.map(piece => frame.clone().multiply(piece)));
        const forEvery = (colors: THREE.Color[]) => frames.flatMap(() => colors);
        return {
            bars: inHall(one.bars),
            panes: inHall(one.panes),
            paneColors: forEvery(one.paneColors),
            discs: inHall(one.discs),
            discColors: forEvery(one.discColors),
            petals: inHall(one.petals),
            petalColors: forEvery(one.petalColors),
            rosettes: inHall(one.rosettes),
            bosses: inHall(one.bosses),
        };
    }, [windows, straight]);

    const opacity = seeThrough ? 0.7 : 1;
    const stone = <meshStandardMaterial color={DRESSED_STONE} roughness={0.8} transparent={seeThrough} opacity={opacity} />;
    const bronze = <meshStandardMaterial color={BRONZE} roughness={0.45} metalness={0.5} transparent={seeThrough} opacity={opacity} />;
    const gilt = <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} transparent={seeThrough} opacity={opacity} />;
    // Coloured glass shows its own colour, as if lit from behind; each piece is tinted its own colour.
    const stained = <meshBasicMaterial color="#ffffff" transparent={seeThrough} opacity={opacity} />;
    const sillWidth = WINDOW_WIDTH + WINDOW_SURROUND * 2;
    const crown = straight + WINDOW_WIDTH / 2;

    return (
        <group>
            {windows.map(window => (
                <group key={`${window.x},${window.z}`} position={[window.x, WINDOW_SILL, window.z]} rotation={[0, window.rotationY, 0]}>
                    <mesh geometry={shapes.surround}>{stone}</mesh>
                    <mesh geometry={shapes.moulding}>{stone}</mesh>
                    <mesh geometry={shapes.opening} position={[0, 0, GLASS_SETBACK]}>
                        <meshStandardMaterial color={DAYLIGHT} emissive={DAYLIGHT} emissiveIntensity={0.7} transparent opacity={0.9} />
                    </mesh>
                    {/* The bronze frame round the glass, its bottom rail, and the ring of the rose */}
                    <mesh geometry={shapes.frame} position={[0, 0, GLASS_SETBACK]}>
                        {bronze}
                    </mesh>
                    <mesh position={[0, GLAZING_FRAME / 2, GLASS_SETBACK + GLAZING_FRAME / 2]}>
                        <boxGeometry args={[WINDOW_WIDTH, GLAZING_FRAME, GLAZING_FRAME]} />
                        {bronze}
                    </mesh>
                    <mesh geometry={ROSE_RING} position={[0, straight + ROSE_RISE, GLASS_SETBACK + 0.03]}>
                        {bronze}
                    </mesh>
                    {/* The keystone at the crown of the arch, and the hood moulding over it */}
                    <mesh position={[0, crown + WINDOW_SURROUND / 2, KEYSTONE_DEPTH / 2]}>
                        <boxGeometry args={[0.28, WINDOW_SURROUND + 0.2, KEYSTONE_DEPTH]} />
                        {stone}
                    </mesh>
                    <mesh geometry={HOOD} position={[0, straight, 0.05]}>
                        {stone}
                    </mesh>
                    {/* The sill, on a narrower moulding, with a vase of flowers */}
                    <mesh position={[0, -0.05, 0.15]}>
                        <boxGeometry args={[sillWidth + 0.2, 0.1, 0.3]} />
                        {stone}
                    </mesh>
                    <mesh position={[0, -0.135, 0.1]}>
                        <boxGeometry args={[sillWidth, 0.07, 0.2]} />
                        {stone}
                    </mesh>
                    <FlowerVase position={[0, 0, 0.19]} seed={`sill${window.x},${window.z}`} scale={0.9} seeThrough={seeThrough} />
                </group>
            ))}
            <InstancedPart geometry={UNIT_BOX} matrices={glazing.bars}>
                {bronze}
            </InstancedPart>
            <InstancedPart geometry={UNIT_PANE} matrices={glazing.panes} colors={glazing.paneColors}>
                {stained}
            </InstancedPart>
            <InstancedPart geometry={UNIT_DISC} matrices={glazing.discs} colors={glazing.discColors}>
                {stained}
            </InstancedPart>
            <InstancedPart geometry={PETAL} matrices={glazing.petals} colors={glazing.petalColors}>
                {stained}
            </InstancedPart>
            <InstancedPart geometry={UNIT_OCTAGON} matrices={glazing.rosettes}>
                {gilt}
            </InstancedPart>
            <InstancedPart geometry={UNIT_BALL} matrices={glazing.bosses}>
                {gilt}
            </InstancedPart>
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
