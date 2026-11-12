import * as THREE from 'three';
import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { BRACKET, GILT, UNIT_BALL, UNIT_BOX, UNIT_OCTAGON } from './ornamentShapes.ts';
import type { Vec3 } from './ornamentShapes.ts';

// Victorian ornaments shared across the hall; their shapes and colours are in ornamentShapes.ts.

interface InstancedPartProps {
    geometry: THREE.BufferGeometry;
    matrices: THREE.Matrix4[];
    /** A colour for each copy, multiplied with the material's colour (leave that white to show these as they are). */
    colors?: THREE.Color[];
    children: ReactNode;
}

/** Many copies of one shape in one draw call, each placed by its own matrix and, if given, tinted its own colour. */
export function InstancedPart({ geometry, matrices, colors, children }: InstancedPartProps) {
    const ref = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.instanceMatrix.needsUpdate = true;
        if (colors) {
            colors.forEach((color, i) => mesh.setColorAt(i, color));
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        mesh.computeBoundingSphere();
    }, [matrices, colors]);

    return (
        <instancedMesh key={matrices.length} ref={ref} args={[geometry, undefined, matrices.length]} raycast={() => null}>
            {children}
        </instancedMesh>
    );
}

interface OrnamentProps {
    position: Vec3;
    /** Turn about the vertical axis; 0 faces +z. */
    rotationY?: number;
    seeThrough: boolean;
}

const gilt = (seeThrough: boolean) => (
    <meshStandardMaterial color={GILT} roughness={0.3} metalness={0.7} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
);

/** A gilt rosette facing +z: an octagonal boss ringed with a bead, with a domed centre. Its back sits at `position`. */
export function Rosette({ position, rotationY = 0, radius, seeThrough }: OrnamentProps & { radius: number }) {
    const material = gilt(seeThrough);
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh geometry={UNIT_OCTAGON} position={[0, 0, radius * 0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[radius, radius * 0.24, radius]}>
                {material}
            </mesh>
            <mesh position={[0, 0, radius * 0.26]}>
                <torusGeometry args={[radius * 0.68, radius * 0.13, 6, 16]} />
                {material}
            </mesh>
            <mesh geometry={UNIT_BALL} position={[0, 0, radius * 0.24]} scale={[radius * 0.36, radius * 0.36, radius * 0.3]}>
                {material}
            </mesh>
        </group>
    );
}

/** A gilt lozenge (a diamond) facing +z, `size` across from point to point. Its back sits at `position`. */
export function Lozenge({ position, rotationY = 0, size, seeThrough }: OrnamentProps & { size: number }) {
    const side = size / Math.SQRT2;
    return (
        <mesh geometry={UNIT_BOX} position={position} rotation={[0, rotationY, Math.PI / 4]} scale={[side, side, 0.012]}>
            {gilt(seeThrough)}
        </mesh>
    );
}

interface ScrollBracketProps extends OrnamentProps {
    /** How far it reaches out from the wall (+z), how tall it is, and how thick. */
    reach: number;
    height: number;
    thickness: number;
    color: string;
}

/**
 * A carved scroll bracket (a console) standing against a wall that faces +z: its back on the wall, its flat top at
 * `position.y + height`, centred on `position.x`.
 */
export function ScrollBracket({ position, rotationY = 0, reach, height, thickness, color, seeThrough }: ScrollBracketProps) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Turned a quarter so the drawing's x runs out from the wall and its thickness runs along the wall. */}
            <mesh geometry={BRACKET} position={[thickness / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[reach, height, thickness]}>
                <meshStandardMaterial color={color} roughness={0.7} transparent={seeThrough} opacity={seeThrough ? 0.7 : 1} />
            </mesh>
        </group>
    );
}
