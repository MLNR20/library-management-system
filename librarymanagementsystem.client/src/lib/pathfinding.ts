/** A walkable area (x/z in the floor's own units) with boxes that cannot be crossed. */
export interface Grid {
    minX: number;
    minZ: number;
    cols: number;
    rows: number;
    cell: number;
    blocked: Uint8Array;
}

export interface Box {
    x: number;
    z: number;
    hx: number;
    hz: number;
}

export type Point2 = [number, number];

const CELL = 0.2;

/** Rasterises the floor: every cell that touches an obstacle (grown by `margin`) is blocked. */
export function buildGrid(width: number, depth: number, obstacles: Box[], margin: number, wallGap: number): Grid {
    const minX = -width / 2 + wallGap;
    const minZ = -depth / 2 + wallGap;
    const cols = Math.max(1, Math.floor((width - wallGap * 2) / CELL));
    const rows = Math.max(1, Math.floor((depth - wallGap * 2) / CELL));
    const blocked = new Uint8Array(cols * rows);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = minX + (c + 0.5) * CELL;
            const cz = minZ + (r + 0.5) * CELL;
            if (obstacles.some(o => Math.abs(cx - o.x) < o.hx + margin && Math.abs(cz - o.z) < o.hz + margin)) {
                blocked[r * cols + c] = 1;
            }
        }
    }
    return { minX, minZ, cols, rows, cell: CELL, blocked };
}

const toCell = (grid: Grid, [x, z]: Point2): [number, number] => [
    Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.minX) / grid.cell))),
    Math.min(grid.rows - 1, Math.max(0, Math.floor((z - grid.minZ) / grid.cell))),
];

const toPoint = (grid: Grid, c: number, r: number): Point2 => [
    grid.minX + (c + 0.5) * grid.cell,
    grid.minZ + (r + 0.5) * grid.cell,
];

const isFree = (grid: Grid, c: number, r: number) =>
    c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.blocked[r * grid.cols + c] === 0;

/** The free cell closest to `cell` (itself when it is free). */
function nearestFree(grid: Grid, cell: [number, number]): [number, number] | null {
    if (isFree(grid, cell[0], cell[1])) return cell;
    for (let radius = 1; radius < Math.max(grid.cols, grid.rows); radius++) {
        let best: [number, number] | null = null;
        let bestDistance = Infinity;
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
                const c = cell[0] + dc;
                const r = cell[1] + dr;
                if (!isFree(grid, c, r)) continue;
                const distance = dc * dc + dr * dr;
                if (distance < bestDistance) {
                    best = [c, r];
                    bestDistance = distance;
                }
            }
        }
        if (best) return best;
    }
    return null;
}

/** True when the straight line between two cells never touches a blocked cell. */
function lineIsFree(grid: Grid, a: [number, number], b: [number, number]): boolean {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2;
    for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const c = Math.round(a[0] + (b[0] - a[0]) * t);
        const r = Math.round(a[1] + (b[1] - a[1]) * t);
        if (!isFree(grid, c, r)) return false;
    }
    return true;
}

const NEIGHBOURS: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
];

/**
 * Shortest walkable route between two points (A* on the grid, then straightened so it only bends where it has to).
 * A start or goal inside an obstacle is moved to the nearest free spot. Returns null when no route exists.
 */
export function findPath(grid: Grid, from: Point2, to: Point2): Point2[] | null {
    const start = nearestFree(grid, toCell(grid, from));
    const goal = nearestFree(grid, toCell(grid, to));
    if (!start || !goal) return null;

    const index = (c: number, r: number) => r * grid.cols + c;
    const cost = new Float64Array(grid.cols * grid.rows).fill(Infinity);
    const parent = new Int32Array(grid.cols * grid.rows).fill(-1);
    const closed = new Uint8Array(grid.cols * grid.rows);
    const heuristic = (c: number, r: number) => Math.hypot(c - goal[0], r - goal[1]);

    // The grids are small (a few thousand cells), so a plain array as the open set is fast enough.
    const open: { c: number; r: number; f: number }[] = [{ c: start[0], r: start[1], f: heuristic(...start) }];
    cost[index(...start)] = 0;

    while (open.length > 0) {
        let best = 0;
        for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
        const { c, r } = open.splice(best, 1)[0];
        if (closed[index(c, r)]) continue;
        closed[index(c, r)] = 1;

        if (c === goal[0] && r === goal[1]) {
            const cells: [number, number][] = [];
            for (let at = index(c, r); at !== -1; at = parent[at]) cells.push([at % grid.cols, Math.floor(at / grid.cols)]);
            cells.reverse();
            return straighten(grid, cells).map(([cc, rr]) => toPoint(grid, cc, rr));
        }

        for (const [dc, dr, step] of NEIGHBOURS) {
            const nc = c + dc;
            const nr = r + dr;
            if (!isFree(grid, nc, nr) || closed[index(nc, nr)]) continue;
            // No cutting corners between two blocked cells.
            if (dc !== 0 && dr !== 0 && (!isFree(grid, c + dc, r) || !isFree(grid, c, r + dr))) continue;
            const next = cost[index(c, r)] + step;
            if (next < cost[index(nc, nr)]) {
                cost[index(nc, nr)] = next;
                parent[index(nc, nr)] = index(c, r);
                open.push({ c: nc, r: nr, f: next + heuristic(nc, nr) });
            }
        }
    }
    return null;
}

/** Keeps only the cells where the route has to turn: skips ahead whenever a straight line is clear. */
function straighten(grid: Grid, cells: [number, number][]): [number, number][] {
    if (cells.length <= 2) return cells;
    const result = [cells[0]];
    let anchor = 0;
    while (anchor < cells.length - 1) {
        let next = cells.length - 1;
        while (next > anchor + 1 && !lineIsFree(grid, cells[anchor], cells[next])) next--;
        result.push(cells[next]);
        anchor = next;
    }
    return result;
}
