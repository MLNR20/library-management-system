import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import type { Route } from './route.ts';

const ROUTE_COLOR = '#f97316';
/** How fast the travelling dot moves along the route, in map units per second. */
const FLOW_SPEED = 2.5;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The part of the route on one floor: a solid line with a dot running along it, a label at the door and a glowing marker on the book's shelf. */
export function RoutePath({ route, index }: { route: Route; index: number }) {
    const segment = route.segments.find(s => s.index === index);
    const showEntrance = route.entrance?.index === index;
    const showDestination = route.destination.index === index;
    const pulse = useRef<Mesh>(null);
    const walker = useRef<Mesh>(null);

    // Running length at each point, so the dot can be placed any distance along the line.
    const lengths = useMemo(() => {
        const points = segment?.points ?? [];
        const total = [0];
        for (let i = 1; i < points.length; i++) {
            total.push(total[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
        }
        return total;
    }, [segment]);

    useFrame(({ clock }) => {
        if (reducedMotion()) return;
        // The marker breathes so it stands out among the books.
        pulse.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.25);

        // The dot runs from the door towards the book, showing which way to walk, then starts over.
        const points = segment?.points;
        const total = lengths[lengths.length - 1];
        if (!walker.current || !points || !total) return;
        const distance = (clock.elapsedTime * FLOW_SPEED) % total;
        let i = 1;
        while (i < lengths.length - 1 && lengths[i] < distance) i++;
        const t = (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
        walker.current.position.set(
            points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
            points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t + 0.05,
            points[i - 1][2] + (points[i][2] - points[i - 1][2]) * t,
        );
    });

    return (
        <group>
            {segment && (
                <>
                    <Line points={segment.points} color={ROUTE_COLOR} lineWidth={4} raycast={() => null} />
                    <mesh ref={walker} raycast={() => null}>
                        <sphereGeometry args={[0.1, 16, 12]} />
                        <meshBasicMaterial color="#ffffff" />
                    </mesh>
                </>
            )}
            {showEntrance && route.entrance && (
                <Html position={route.entrance.position} center style={{ pointerEvents: 'none' }} distanceFactor={11}>
                    <div className="-translate-y-4 rounded bg-warning px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-warning-content">
                        Entrance
                    </div>
                </Html>
            )}
            {showDestination && (
                <mesh ref={pulse} position={route.destination.position} raycast={() => null}>
                    <sphereGeometry args={[0.14, 20, 16]} />
                    <meshBasicMaterial color={ROUTE_COLOR} transparent opacity={0.9} depthTest={false} />
                </mesh>
            )}
        </group>
    );
}
