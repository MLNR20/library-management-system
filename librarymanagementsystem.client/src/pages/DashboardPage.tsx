import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page } from '../components/layout/Page.tsx';
import { StatCard } from '../components/ui/Card.tsx';
import { AuthorIcon, BookIcon, GenreIcon, LoanIcon } from '../components/ui/icons.tsx';
import { authorHooks, BookStatus, bookHooks, bookStatusLabels, genreHooks } from '../api/resources.ts';
import { statusColors } from '../components/library-map/palette.ts';

const tooltipStyle = {
    background: 'var(--color-base-100)',
    border: '1px solid var(--color-base-300)',
    borderRadius: 'var(--radius-box)',
};

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
    return (
        <div className="card card-border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-base">{title}</h3>
                {empty ? (
                    <p className="py-16 text-center text-sm opacity-60">Nothing to chart yet.</p>
                ) : (
                    <div className="h-72">{children}</div>
                )}
            </div>
        </div>
    );
}

function countBy<T>(items: T[], key: (item: T) => string): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function DashboardPage() {
    const books = bookHooks.useList().data;
    const authors = authorHooks.useList().data;
    const genres = genreHooks.useList().data;

    const count = (items: unknown[] | undefined) => items?.length ?? '—';
    const borrowed = books?.filter(b => b.status === BookStatus.Borrowed).length;

    const byGenre = useMemo(() => countBy(books ?? [], book => book.genreName), [books]);
    const byStatus = useMemo(
        () =>
            Object.values(BookStatus)
                .map(status => ({
                    name: bookStatusLabels[status],
                    count: (books ?? []).filter(book => book.status === status).length,
                    color: statusColors[status],
                }))
                .filter(entry => entry.count > 0),
        [books],
    );
    // A book can sit on several floors; it counts once for each.
    const byFloor = useMemo(
        () => countBy((books ?? []).flatMap(book => [...new Set(book.rows.map(row => row.floorName))]), floor => floor),
        [books],
    );

    return (
        <Page title="Dashboard" description="A quick look at the catalogue.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Books" value={count(books)} hint="Titles in the catalogue" icon={<BookIcon />} />
                <StatCard label="Borrowed" value={borrowed ?? '—'} hint="Currently on loan" icon={<LoanIcon />} />
                <StatCard label="Authors" value={count(authors)} icon={<AuthorIcon />} />
                <StatCard label="Genres" value={count(genres)} icon={<GenreIcon />} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Books by genre" empty={byGenre.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byGenre} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} interval={0} />
                            <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-base-200)' }} />
                            <Bar dataKey="count" name="Books" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Books by status" empty={byStatus.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                                {byStatus.map(entry => (
                                    <Cell key={entry.name} fill={entry.color} stroke="var(--color-base-100)" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Books by floor" empty={byFloor.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byFloor} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-base-200)' }} />
                            <Bar dataKey="count" name="Books" fill="var(--color-secondary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </Page>
    );
}
