import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useContextBridge } from '@react-three/drei';
import * as THREE from 'three';
import type { Book } from '../../api/resources.ts';
import { PLANK, SHELF_DEPTH, SHELF_WIDTH, TIER_HEIGHT, hash01 } from '../../lib/libraryLayout.ts';
import type { FloorLayout, ShelfLayout, TierLayout } from '../../lib/libraryLayout.ts';
import { LibraryDragContext } from './dragContext.ts';
import { sectionColor, statusColors } from './palette.ts';
import { useLibraryDrag } from './useLibraryDrag.ts';

const WOOD = '#8a6a4b';
const DROP_COLOR = '#38bdf8';
const GAP = 0.012;

interface LibraryCanvasProps {
    floors: FloorLayout[];
    /** Show every floor stacked on top of each other instead of just the first one passed in. */
    stacked: boolean;
}

export function LibraryCanvas({ floors, stacked }: LibraryCanvasProps) {
    // Canvas renders in its own React root, so the drag context has to be carried across.
    const ContextBridge = useContextBridge(LibraryDragContext);
    const spacing = Math.max(4, ...floors.map(f => f.height)) + 3;
    const focus = useMemo(() => {
        const count = Math.max(1, floors.length);
        const width = Math.max(9, ...floors.map(f => f.width));
        const depth = Math.max(7, ...floors.map(f => f.depth));
        const tallest = Math.max(2, ...floors.map(f => f.height));
        const totalHeight = stacked ? (count - 1) * spacing + tallest : tallest;
        return { x: 0, y: totalHeight / 2, z: 0, size: Math.max(width, depth, totalHeight) };
    }, [floors, stacked, spacing]);

    return (
        <Canvas
            camera={{ position: [0, 9, 15], fov: 45 }}
            dpr={[1, 2]}
            aria-label="3D map of the library. Use the lists and tables to manage books without the mouse."
        >
            <ContextBridge>
                <ambientLight intensity={1.1} />
                <directionalLight position={[6, 14, 9]} intensity={1.6} />
                {floors.map((layout, index) => (
                    <group key={layout.floor.id} position={[0, stacked ? index * spacing : 0, 0]}>
                        <FloorModel layout={layout} />
                    </group>
                ))}
                <Controls />
                <CameraRig focus={focus} focusKey={`${stacked}-${floors.map(f => f.floor.id).join(',')}`} />
                <RowPickerBridge />
                <CursorManager />
            </ContextBridge>
        </Canvas>
    );
}

// The orbit controls must not rotate the view while a book is being dragged.
function Controls() {
    const { drag } = useLibraryDrag();
    return (
        <OrbitControls
            makeDefault
            enabled={!drag}
            maxPolarAngle={Math.PI * 0.49}
            minDistance={3}
            maxDistance={70}
            enableDamping={false}
        />
    );
}

interface CameraRigProps {
    focus: { x: number; y: number; z: number; size: number };
    focusKey: string;
}

// Re-frames the view whenever the set of visible floors changes.
function CameraRig({ focus, focusKey }: CameraRigProps) {
    const camera = useThree(state => state.camera);
    const controls = useThree(state => state.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;

    useEffect(() => {
        if (!controls) return;
        camera.position.set(focus.x, focus.y + focus.size * 0.55 + 2, focus.z + focus.size * 0.95 + 4);
        controls.target.set(focus.x, focus.y, focus.z);
        controls.update();
        // Only re-frame when the visible floors change, not on every data refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controls, focusKey]);

    return null;
}

// Lets the drag provider ask "which row is under the pointer?" with a fresh raycast, ignoring books in front.
function RowPickerBridge() {
    const { registerPicker } = useLibraryDrag();
    const gl = useThree(state => state.gl);
    const camera = useThree(state => state.camera);
    const scene = useThree(state => state.scene);

    useEffect(() => {
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();

        registerPicker((clientX, clientY) => {
            const canvas = gl.domElement;
            // Only when the pointer is really over the canvas (not a panel or overlay on top of it).
            if (document.elementFromPoint(clientX, clientY) !== canvas) return null;

            const rect = canvas.getBoundingClientRect();
            ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);

            const zones: THREE.Object3D[] = [];
            scene.traverse(object => {
                if (object.userData.rowZone) zones.push(object);
            });
            const hit = raycaster.intersectObjects(zones, false)[0];
            return (hit?.object.userData.rowId as string | undefined) ?? null;
        });

        return () => registerPicker(null);
    }, [registerPicker, gl, camera, scene]);

    return null;
}

function CursorManager() {
    const { drag, hoverBook } = useLibraryDrag();
    const cursor = drag?.active ? 'grabbing' : hoverBook ? 'grab' : '';

    useEffect(() => {
        document.body.style.cursor = cursor;
        return () => {
            document.body.style.cursor = '';
        };
    }, [cursor]);

    return null;
}

function FloorModel({ layout }: { layout: FloorLayout }) {
    return (
        <group>
            <mesh position={[0, -0.1, 0]}>
                <boxGeometry args={[layout.width, 0.2, layout.depth]} />
                <meshStandardMaterial color="#64748b" transparent opacity={0.4} />
            </mesh>
            <Html position={[-layout.width / 2 + 0.3, 0.1, layout.depth / 2]} style={{ pointerEvents: 'none' }}>
                <div className="rounded bg-base-100/80 px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                    {layout.floor.name}
                </div>
            </Html>
            {layout.shelves.map(shelf => (
                <ShelfModel key={shelf.shelf.id} layout={shelf} />
            ))}
            {layout.shelves.length === 0 && (
                <Html position={[0, 0.5, 0]} center style={{ pointerEvents: 'none' }}>
                    <div className="rounded bg-base-100/80 px-2 py-1 text-xs whitespace-nowrap opacity-70">
                        No shelves on this floor yet
                    </div>
                </Html>
            )}
        </group>
    );
}

function ShelfModel({ layout }: { layout: ShelfLayout }) {
    const { drag, hoverRowId } = useLibraryDrag();
    const tierCount = Math.max(1, layout.tiers.length);
    const bodyHeight = tierCount * TIER_HEIGHT;
    const sectionTint = layout.sections[0] ? sectionColor(layout.sections[0].id) : null;

    return (
        <group position={[layout.x, 0, layout.z]}>
            {sectionTint && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[SHELF_WIDTH + 0.6, SHELF_DEPTH + 0.8]} />
                    <meshBasicMaterial color={sectionTint} transparent opacity={0.55} />
                </mesh>
            )}

            {/* Frame: two sides, a back and a plank under every tier plus a top. */}
            {[-1, 1].map(side => (
                <mesh key={side} position={[(side * SHELF_WIDTH) / 2, bodyHeight / 2, 0]}>
                    <boxGeometry args={[PLANK, bodyHeight + PLANK, SHELF_DEPTH]} />
                    <meshStandardMaterial color={WOOD} />
                </mesh>
            ))}
            <mesh position={[0, bodyHeight / 2, -SHELF_DEPTH / 2 + 0.02]}>
                <boxGeometry args={[SHELF_WIDTH, bodyHeight + PLANK, 0.04]} />
                <meshStandardMaterial color="#6b5239" />
            </mesh>
            {Array.from({ length: tierCount + 1 }, (_, i) => (
                <mesh key={i} position={[0, i * TIER_HEIGHT, 0]}>
                    <boxGeometry args={[SHELF_WIDTH, PLANK, SHELF_DEPTH]} />
                    <meshStandardMaterial color={WOOD} />
                </mesh>
            ))}

            {layout.tiers.map((tier, index) => (
                <Tier
                    key={tier.row.id}
                    tier={tier}
                    index={index}
                    dropState={
                        !drag?.active ? 'idle' : hoverRowId === tier.row.id ? 'hover' : 'available'
                    }
                />
            ))}

            {layout.tiers.length === 0 && (
                <Html position={[0, bodyHeight / 2, 0.1]} center style={{ pointerEvents: 'none' }}>
                    <div className="rounded bg-base-100/80 px-2 py-0.5 text-[10px] whitespace-nowrap opacity-70">
                        No rows yet
                    </div>
                </Html>
            )}

            <Html position={[0, bodyHeight + 0.45, 0]} center style={{ pointerEvents: 'none' }} distanceFactor={11}>
                <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                    <span className="rounded bg-base-100/85 px-2 py-0.5 text-xs font-semibold">{layout.shelf.name}</span>
                    {layout.sections.map(section => (
                        <span
                            key={section.id}
                            className="rounded px-1.5 text-[10px] font-semibold text-black"
                            style={{ background: sectionColor(section.id) }}
                        >
                            {section.name}
                        </span>
                    ))}
                </div>
            </Html>
        </group>
    );
}

type DropState = 'idle' | 'available' | 'hover';

function Tier({ tier, index, dropState }: { tier: TierLayout; index: number; dropState: DropState }) {
    const { row } = tier;
    const midY = index * TIER_HEIGHT + TIER_HEIGHT / 2 + PLANK / 2;
    const glowOpacity = dropState === 'hover' ? 0.4 : dropState === 'available' ? 0.1 : 0;

    return (
        <group>
            {/* Invisible plane at the back of the tier: what a drop is matched against (books in front are ignored). */}
            <mesh position={[0, midY, -SHELF_DEPTH / 2 + 0.05]} userData={{ rowZone: true, rowId: row.id }}>
                <planeGeometry args={[SHELF_WIDTH - 0.1, TIER_HEIGHT - 0.1]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>

            {glowOpacity > 0 && (
                <mesh position={[0, midY, 0]} raycast={() => null}>
                    <boxGeometry args={[SHELF_WIDTH - 0.08, TIER_HEIGHT - 0.1, SHELF_DEPTH - 0.05]} />
                    <meshBasicMaterial color={DROP_COLOR} transparent opacity={glowOpacity} depthWrite={false} />
                </mesh>
            )}

            <Html
                position={[-SHELF_WIDTH / 2 - 0.1, midY, SHELF_DEPTH / 2]}
                style={{ pointerEvents: 'none' }}
                distanceFactor={11}
            >
                <div className="-translate-x-full rounded bg-base-100/80 px-1 text-[10px] whitespace-nowrap">
                    {row.name}
                </div>
            </Html>

            <TierBooks tier={tier} index={index} />
        </group>
    );
}

function TierBooks({ tier, index }: { tier: TierLayout; index: number }) {
    const { drag, hoverBook, selectedBookId, beginDrag, setHoverBook, clearHoverBook } = useLibraryDrag();
    const controls = useThree(state => state.controls) as unknown as { enabled: boolean } | null;
    const floorY = index * TIER_HEIGHT + PLANK / 2;

    const { placed, overflow } = useMemo(() => {
        const placed: { book: Book; x: number; width: number; height: number }[] = [];
        let overflow = 0;
        let cursor = -SHELF_WIDTH / 2 + PLANK / 2 + 0.08;
        const limit = SHELF_WIDTH / 2 - PLANK / 2 - 0.08;
        for (const book of tier.books) {
            const width = THREE.MathUtils.clamp(0.06 + book.pages / 2600, 0.07, 0.2);
            if (cursor + width > limit) {
                overflow++;
                continue;
            }
            const height = TIER_HEIGHT * (0.55 + hash01(book.id) * 0.3);
            placed.push({ book, x: cursor + width / 2, width, height });
            cursor += width + GAP;
        }
        return { placed, overflow };
    }, [tier.books]);

    return (
        <group>
            {placed.map(({ book, x, width, height }) => {
                const lifted = drag?.active && drag.book.id === book.id && drag.fromRowId === tier.row.id;
                const highlighted = hoverBook?.id === book.id || selectedBookId === book.id;
                return (
                    <mesh
                        key={book.id}
                        position={[x, floorY + height / 2, 0.05]}
                        onPointerDown={event => {
                            if (event.button !== 0) return;
                            event.stopPropagation();
                            // Stop the orbit controls right now; React would only disable them after this event.
                            if (controls) controls.enabled = false;
                            beginDrag(book, tier.row.id, event.nativeEvent);
                        }}
                        onPointerOver={event => {
                            event.stopPropagation();
                            setHoverBook(book);
                        }}
                        onPointerOut={() => clearHoverBook(book.id)}
                    >
                        <boxGeometry args={[width, height, SHELF_DEPTH * 0.7]} />
                        <meshStandardMaterial
                            color={bookColor(book)}
                            emissive="#ffffff"
                            emissiveIntensity={highlighted ? 0.45 : 0}
                            transparent={lifted}
                            opacity={lifted ? 0.25 : 1}
                        />
                    </mesh>
                );
            })}
            {overflow > 0 && (
                <Html position={[SHELF_WIDTH / 2 - 0.2, floorY + 0.15, SHELF_DEPTH / 2]} style={{ pointerEvents: 'none' }} distanceFactor={11}>
                    <div className="rounded bg-base-100/90 px-1 text-[10px] font-semibold whitespace-nowrap">+{overflow}</div>
                </Html>
            )}
        </group>
    );
}

function bookColor(book: Book): THREE.Color {
    // A little lightness variation so neighbouring books can be told apart.
    return new THREE.Color(statusColors[book.status]).offsetHSL(0, 0, (hash01(book.id + 'c') - 0.5) * 0.16);
}
