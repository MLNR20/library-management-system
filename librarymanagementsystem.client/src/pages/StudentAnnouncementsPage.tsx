import { useCallback, useMemo, useState } from 'react';
import { announcementHooks } from '../api/resources.ts';
import type { Announcement } from '../api/resources.ts';
import { useAuth } from '../auth/useAuth.ts';
import { Page } from '../components/layout/Page.tsx';
import { richTextToPlain, RichText } from '../components/ui/RichText.tsx';

type ReadFilter = 'all' | 'unread' | 'read';

const readFilters: { value: ReadFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
];

/** The day of a timestamp in the reader's own time zone, as yyyy-mm-dd (what a date input holds). */
const localDay = (iso: string) => {
    const date = new Date(iso);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/**
 * Which announcements this reader has opened. The server does not track it, so it lives in this browser,
 * one list per user name.
 */
function useReadIds(userName: string | undefined) {
    const key = `lms.readAnnouncements.${userName ?? ''}`;
    const [ids, setIds] = useState<Set<string>>(() => {
        try {
            return new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
        } catch {
            return new Set<string>();
        }
    });

    const save = useCallback(
        (next: Set<string>) => {
            setIds(next);
            try {
                localStorage.setItem(key, JSON.stringify([...next]));
            } catch {
                // Private mode or a full disk: it still works until the page is closed.
            }
        },
        [key],
    );

    return { ids, save };
}

/** Every announcement, newest first, with a search box, a date range and a read/unread filter. */
export function StudentAnnouncementsPage() {
    const { user } = useAuth();
    const { data: announcements = [], isLoading } = announcementHooks.useList();
    const { ids: readIds, save } = useReadIds(user?.userName);

    const [search, setSearch] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [readFilter, setReadFilter] = useState<ReadFilter>('all');

    const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        return announcements.filter(announcement => {
            const day = localDay(announcement.createdAt);
            if (from && day < from) return false;
            if (to && day > to) return false;
            if (readFilter === 'unread' && readIds.has(announcement.id)) return false;
            if (readFilter === 'read' && !readIds.has(announcement.id)) return false;
            if (!query) return true;
            return [announcement.title, richTextToPlain(announcement.body), announcement.floorName ?? '']
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }, [announcements, search, from, to, readFilter, readIds]);

    const setRead = (announcement: Announcement, read: boolean) => {
        const next = new Set(readIds);
        if (read) next.add(announcement.id);
        else next.delete(announcement.id);
        save(next);
    };

    const filtering = search.trim() !== '' || from !== '' || to !== '' || readFilter !== 'all';
    const clear = () => {
        setSearch('');
        setFrom('');
        setTo('');
        setReadFilter('all');
    };

    return (
        <Page title="Announcements">
            {isLoading ? (
                <span className="loading loading-spinner" aria-label="Loading announcements" />
            ) : announcements.length === 0 ? (
                <p className="opacity-70">There are no announcements yet.</p>
            ) : (
                <div className="flex w-full flex-col gap-4">
                    {/* Two columns: search and its buttons on the left; the dates and the read filter on the right. */}
                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-base-300 bg-base-100 p-4 lg:grid-cols-2">
                        <div className="flex flex-col justify-between gap-3">
                            <label className="input w-full">
                                <svg aria-hidden="true" className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                                </svg>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search announcements"
                                    aria-label="Search announcements"
                                />
                            </label>

                            <div className="flex flex-wrap items-center gap-2">
                                {filtering && (
                                    <button className="btn btn-ghost btn-sm" onClick={clear}>
                                        Clear filters
                                    </button>
                                )}
                                {unreadCount > 0 && (
                                    <button className="btn btn-outline btn-sm" onClick={() => save(new Set(announcements.map(a => a.id)))}>
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="form-control">
                                    <span className="label-text mb-1 text-xs">From</span>
                                    <input type="date" className="input input-sm w-full" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1 text-xs">To</span>
                                    <input type="date" className="input input-sm w-full" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
                                </label>
                            </div>

                            <div role="tablist" aria-label="Read status" className="tabs tabs-box tabs-sm w-fit">
                                {readFilters.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        role="tab"
                                        aria-selected={readFilter === value}
                                        className={`tab ${readFilter === value ? 'tab-active' : ''}`}
                                        onClick={() => setReadFilter(value)}
                                    >
                                        {label}
                                        {value === 'unread' && unreadCount > 0 && <span className="badge badge-primary badge-xs ml-2">{unreadCount}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {visible.length === 0 ? (
                        <p className="opacity-70">No announcements match your search and filters.</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {visible.map(announcement => {
                                const read = readIds.has(announcement.id);
                                return (
                                    <li key={announcement.id} className="card border border-base-300 bg-base-200">
                                        <div className="card-body gap-2">
                                            <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
                                                <time dateTime={announcement.createdAt}>
                                                    {new Date(announcement.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </time>
                                                {announcement.floorName && <span className="badge badge-outline badge-sm">{announcement.floorName}</span>}
                                                {!read && <span className="badge badge-primary badge-sm">New</span>}
                                            </div>
                                            <h3 className="card-title">{announcement.title}</h3>
                                            <RichText html={announcement.body} className="text-sm opacity-80" />
                                            <div className="card-actions justify-end">
                                                <button className="btn btn-ghost btn-sm" onClick={() => setRead(announcement, !read)}>
                                                    {read ? 'Mark as unread' : 'Mark as read'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </Page>
    );
}
