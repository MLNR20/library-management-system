import * as THREE from 'three';

// The Victorian ornament the hall shares, so the staircase, the doors, the windows and the chairs read as one set:
// polished mahogany, gilt rosettes and lozenges, turned balusters and acorn finials, and carved scroll brackets.

export const MAHOGANY = '#5b2a1a';
export const MAHOGANY_LIGHT = '#7a3b24';
export const GILT = '#b8892b';
/** Red upholstery and carpet, with its gold edging. */
export const VELVET = '#7a1f1f';
/** The dark stained wood of the ground floor's bookcases, and the darker back boards and fluting. */
export const BOOKCASE_WOOD = '#4a2a18';
export const BOOKCASE_SHADOW = '#2e1a10';

export type Vec3 = [number, number, number];

// Shared shapes, built once and scaled per piece.
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_ROD = new THREE.CylinderGeometry(1, 1, 1, 16);
export const UNIT_OCTAGON = new THREE.CylinderGeometry(1, 1, 1, 8);
export const UNIT_BALL = new THREE.SphereGeometry(1, 12, 8);

const lathe = (profile: [number, number][], segments: number) =>
    new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** A turned baluster one unit tall (radius in metres): a plain foot, a vase, rings of beads and a collar at the top. */
export const BALUSTER = lathe(
    [
        [0, 0], [0.03, 0], [0.03, 0.12], [0.022, 0.13], [0.026, 0.15], [0.016, 0.18], [0.013, 0.25], [0.02, 0.33],
        [0.028, 0.4], [0.03, 0.45], [0.024, 0.5], [0.014, 0.55], [0.012, 0.62], [0.018, 0.68], [0.012, 0.72],
        [0.016, 0.76], [0.012, 0.8], [0.012, 0.86], [0.026, 0.88], [0.026, 0.95], [0.03, 0.97], [0.03, 1], [0, 1],
    ],
    12,
);

/** A turned acorn finial, in metres (0.29 tall). */
export const FINIAL = lathe(
    [
        [0, 0], [0.06, 0], [0.06, 0.02], [0.035, 0.045], [0.028, 0.07], [0.05, 0.1], [0.062, 0.135], [0.056, 0.17],
        [0.034, 0.2], [0.016, 0.22], [0.022, 0.24], [0.012, 0.27], [0, 0.29],
    ],
    16,
);

/**
 * A carved scroll bracket, pierced with two round holes. Drawn in a unit square: its straight back runs up x = 0 (against
 * a wall or a riser), its flat top along y = 1 (under whatever it carries), and the scroll curls down from the top's far
 * end back to the foot of the back. One unit thick, extruded towards +z.
 */
function bracketGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.04);
    shape.lineTo(0, 1);
    shape.lineTo(0.92, 1);
    shape.bezierCurveTo(0.95, 0.95, 0.85, 0.8, 0.7, 0.8);
    shape.bezierCurveTo(0.55, 0.8, 0.5, 0.68, 0.6, 0.62);
    shape.bezierCurveTo(0.66, 0.58, 0.55, 0.46, 0.42, 0.48);
    shape.bezierCurveTo(0.3, 0.5, 0.26, 0.38, 0.32, 0.3);
    shape.bezierCurveTo(0.36, 0.24, 0.24, 0.14, 0.12, 0.12);
    shape.lineTo(0.03, 0.04);
    shape.closePath();
    for (const [x, y, r] of [[0.22, 0.78, 0.1], [0.17, 0.45, 0.05]]) {
        const hole = new THREE.Path();
        hole.absarc(x, y, r, 0, Math.PI * 2, true);
        shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 10 });
}
export const BRACKET = bracketGeometry();

// The Greek Ionic order of the colonnades, sized for a shaft 0.2 across at its foot unless said otherwise.

/**
 * A fluted column shaft one unit tall and one unit in radius at its foot: 24 shallow flutes with narrow flat fillets
 * between them, tapering to 85% at the top (the entasis of a Greek column).
 */
function flutedShaftGeometry(flutes = 24) {
    const shape = new THREE.Shape();
    const step = (Math.PI * 2) / flutes;
    const fillet = 0.14;
    const samples = 6;
    for (let i = 0; i < flutes; i++) {
        for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const angle = i * step + step * (fillet / 2 + t * (1 - fillet));
            const r = 1 - 0.08 * Math.sin(Math.PI * t);
            const [x, y] = [Math.cos(angle) * r, Math.sin(angle) * r];
            if (i === 0 && s === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 1 });
    // Stand it up: the extrusion runs up y from 0 to 1.
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const taper = 1 - 0.15 * position.getY(i);
        position.setX(i, position.getX(i) * taper);
        position.setZ(i, position.getZ(i) * taper);
    }
    geometry.computeVertexNormals();
    return geometry;
}
export const FLUTED_SHAFT = flutedShaftGeometry();

/** The Attic base, in metres, on top of a square plinth 0.08 tall: a big round moulding, a hollow, and a smaller round moulding. */
export const ATTIC_BASE = lathe(
    [
        [0, 0.08], [0.22, 0.08], [0.24, 0.09], [0.25, 0.115], [0.24, 0.14], [0.215, 0.152], [0.19, 0.16], [0.182, 0.18],
        [0.188, 0.2], [0.21, 0.212], [0.218, 0.228], [0.21, 0.244], [0.2, 0.252], [0.2, 0.26], [0, 0.26],
    ],
    24,
);

/** The echinus of the capital, in metres: a quarter-round that flares from the top of the shaft out under the volutes. */
export const ECHINUS = lathe(
    [[0, 0], [0.17, 0], [0.185, 0.02], [0.203, 0.05], [0.214, 0.078], [0.21, 0.09], [0, 0.09]],
    24,
);

/** The bead round the top of the shaft, lying flat, in metres. */
export const ASTRAGAL = new THREE.TorusGeometry(0.172, 0.016, 6, 24).rotateX(Math.PI / 2);

/** The spiral of an Ionic volute in the xy plane, one unit across: two and a half turns from the top, rolling out to +x and in. */
function voluteGeometry() {
    const points = Array.from({ length: 61 }, (_, i) => {
        const t = i / 60;
        const angle = Math.PI / 2 - t * 2.5 * Math.PI * 2;
        const r = 1 - 0.85 * t;
        return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, 0.12, 6, false);
}
export const VOLUTE = voluteGeometry();

export function place(position: Vec3, scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0]) {
    return new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...scale),
    );
}

