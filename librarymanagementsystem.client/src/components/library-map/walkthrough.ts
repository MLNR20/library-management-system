import { WALK_HEIGHT } from './route.ts';
import type { Point3, Route } from './route.ts';

/** How high a reader's eyes are above the floor they stand on, in map units (roughly metres). */
export const EYE_HEIGHT = 1.65;
/** The walk ends at least this far from what it looks at, when the route allows it. */
const VIEWING_DISTANCE = 1.7;

/** The route as seen through a reader's eyes: where the camera goes, and the spot on the shelf to look at on arrival. */
export interface WalkPath {
    /** Eye positions in world space, from the door to the front of the shelf. */
    points: Point3[];
    /** Distance walked at each point. */
    lengths: number[];
    total: number;
    /** The book's spot on its shelf, in world space. */
    target: Point3;
}

const gap = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Turns a route into a camera path. Each segment is in its own floor's space, so `storey` lifts it to where that floor
 * stands when the floors are drawn stacked. The route's last point is the book on the shelf: the walk stops in front of it.
 */
export function buildWalkPath(route: Route, storey: number, stacked: boolean): WalkPath | null {
    const points: Point3[] = [];
    // The last point of the last segment is what the walk looks at, not somewhere to stand.
    const last = route.segments[route.segments.length - 1];
    const finalPoint = last?.points[last.points.length - 1];
    if (!last || !finalPoint) return null;
    const target: Point3 = [finalPoint[0], finalPoint[1] + (stacked ? last.index * storey : 0), finalPoint[2]];

    for (const segment of route.segments) {
        const lift = stacked ? segment.index * storey : 0;
        for (const point of segment.points) {
            if (point === finalPoint) continue;
            const eye: Point3 = [point[0], point[1] - WALK_HEIGHT + lift + EYE_HEIGHT, point[2]];
            const previous = points[points.length - 1];
            // A flight's landing is the next floor's first point: keep only one of the two.
            if (!previous || gap(previous, eye) >= 0.01) points.push(eye);
        }
    }

    if (points.length === 0) return null;

    // The route ends right at a shelf; a reader stops a little further back, where the whole bookcase can be seen.
    const [targetX, , targetZ] = target;
    const end = points[points.length - 1];
    const before = points[points.length - 2];
    const close = Math.hypot(targetX - end[0], targetZ - end[2]);
    if (before && close < VIEWING_DISTANCE) {
        const leg = Math.hypot(end[0] - before[0], end[2] - before[2]);
        // Back along the way they came, which is known to be clear, but never past the middle of that last stretch.
        const back = Math.min(VIEWING_DISTANCE - close, leg * 0.6) / (leg || 1);
        points[points.length - 1] = [
            end[0] + (before[0] - end[0]) * back,
            end[1] + (before[1] - end[1]) * back,
            end[2] + (before[2] - end[2]) * back,
        ];
    }

    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + gap(points[i - 1], points[i]));
    return { points, lengths, total: lengths[lengths.length - 1], target };
}

/** The eye position `distance` along the path (held at either end). */
export function sampleWalk(path: WalkPath, distance: number): Point3 {
    const { points, lengths, total } = path;
    if (points.length === 1 || distance <= 0) return points[0];
    if (distance >= total) return points[points.length - 1];

    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const t = (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    const from = points[i - 1];
    const to = points[i];
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
}
