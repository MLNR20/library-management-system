import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleWalk } from './walkthrough.ts';
import type { WalkPath } from './walkthrough.ts';

/** Where the reader is on the walk. The page changes it (play, pause, scrub); the camera rig reads it every frame. */
export interface WalkState {
    /** Distance walked so far along the path. */
    distance: number;
    playing: boolean;
}

/** Map units per second. */
const WALK_SPEED = 2.2;
/** How far ahead on the path the reader looks while walking. */
const LOOK_AHEAD = 2.2;
/** Over the last stretch of the walk the gaze turns from the path to the book. */
const ARRIVAL = 3;
const FIELD_OF_VIEW = 70;
/** Radians of turn per pixel dragged. */
const DRAG_TURN = 0.004;
/** Seconds after letting go before a glance to the side drifts back to the way ahead. */
const GLANCE_HOLD = 1.2;
const MAX_PITCH = 1.3;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const smooth = (t: number) => t * t * (3 - 2 * t);

interface FirstPersonRigProps {
    path: WalkPath;
    state: RefObject<WalkState>;
    /** Called when the walk has moved noticeably: how far along it is (0 to 1). */
    onProgress: (fraction: number) => void;
}

/**
 * Puts the camera at eye height and walks it along the route, facing the way it goes and turning to the book on arrival.
 * Dragging looks around; the view eases back to the way ahead a moment after letting go.
 */
export function FirstPersonRig({ path, state, onProgress }: FirstPersonRigProps) {
    const camera = useThree(three => three.camera) as THREE.PerspectiveCamera;
    const dom = useThree(three => three.gl.domElement);

    const heading = useRef<{ yaw: number; pitch: number } | null>(null);
    const glance = useRef({ yaw: 0, pitch: 0, dragging: false, idle: 0 });
    const reported = useRef(-1);

    // A wider lens for a view from inside the building; put the orbit view's lens back afterwards.
    useEffect(() => {
        const { fov, near } = camera;
        camera.fov = FIELD_OF_VIEW;
        camera.near = 0.1;
        camera.rotation.order = 'YXZ';
        camera.updateProjectionMatrix();
        return () => {
            camera.fov = fov;
            camera.near = near;
            camera.rotation.order = 'XYZ';
            camera.updateProjectionMatrix();
        };
    }, [camera]);

    // Drag to look around.
    useEffect(() => {
        const look = glance.current;
        let last: { x: number; y: number } | null = null;

        const down = (event: PointerEvent) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            last = { x: event.clientX, y: event.clientY };
            look.dragging = true;
            dom.setPointerCapture(event.pointerId);
        };
        const move = (event: PointerEvent) => {
            if (!last) return;
            // Grab the world: dragging right turns the view to the left.
            look.yaw += (event.clientX - last.x) * DRAG_TURN;
            look.pitch += (event.clientY - last.y) * DRAG_TURN;
            last = { x: event.clientX, y: event.clientY };
        };
        const up = () => {
            last = null;
            look.dragging = false;
            look.idle = 0;
        };

        const touchAction = dom.style.touchAction;
        dom.style.touchAction = 'none';
        dom.addEventListener('pointerdown', down);
        dom.addEventListener('pointermove', move);
        dom.addEventListener('pointerup', up);
        dom.addEventListener('pointercancel', up);
        return () => {
            dom.style.touchAction = touchAction;
            dom.removeEventListener('pointerdown', down);
            dom.removeEventListener('pointermove', move);
            dom.removeEventListener('pointerup', up);
            dom.removeEventListener('pointercancel', up);
        };
    }, [dom]);

    useFrame((_, elapsed) => {
        const delta = Math.min(elapsed, 0.1);
        const walk = state.current;
        if (walk.playing) walk.distance += WALK_SPEED * delta;
        walk.distance = clamp(walk.distance, 0, path.total);

        const here = sampleWalk(path, walk.distance);
        const ahead = sampleWalk(path, Math.min(path.total, walk.distance + LOOK_AHEAD));
        const [bookX, bookY, bookZ] = path.target;

        // Facing the book from here, and facing the way the path goes.
        const toBookX = bookX - here[0];
        const toBookZ = bookZ - here[2];
        const bookYaw = Math.atan2(-toBookX, -toBookZ);
        const bookPitch = clamp(Math.atan2(bookY - here[1], Math.hypot(toBookX, toBookZ)), -MAX_PITCH, MAX_PITCH);
        const alongX = ahead[0] - here[0];
        const alongZ = ahead[2] - here[2];
        const pathYaw = Math.hypot(alongX, alongZ) > 1e-3 ? Math.atan2(-alongX, -alongZ) : bookYaw;

        // Turn towards the book over the last few steps.
        const arriving = smooth(1 - clamp((path.total - walk.distance) / ARRIVAL, 0, 1));
        const goalYaw = pathYaw + wrap(bookYaw - pathYaw) * arriving;
        const goalPitch = bookPitch * arriving;

        if (!heading.current) {
            heading.current = { yaw: goalYaw, pitch: goalPitch };
        } else {
            const ease = 1 - Math.exp(-delta * 5);
            heading.current.yaw += wrap(goalYaw - heading.current.yaw) * ease;
            heading.current.pitch += (goalPitch - heading.current.pitch) * ease;
        }

        const look = glance.current;
        if (!look.dragging) {
            look.idle += delta;
            if (look.idle > GLANCE_HOLD) {
                const fade = Math.exp(-delta * 2);
                look.yaw *= fade;
                look.pitch *= fade;
            }
        }

        camera.position.set(here[0], here[1], here[2]);
        camera.rotation.set(
            clamp(heading.current.pitch + look.pitch, -MAX_PITCH, MAX_PITCH),
            heading.current.yaw + look.yaw,
            0,
            'YXZ',
        );

        const fraction = path.total > 0 ? walk.distance / path.total : 1;
        if (Math.abs(fraction - reported.current) > 0.004 || (fraction >= 1 && reported.current < 1)) {
            reported.current = fraction;
            onProgress(fraction);
        }
    });

    return null;
}
