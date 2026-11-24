import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../components/layout/Page.tsx';
import { RichText } from '../components/ui/RichText.tsx';
import type { FindTarget, WalkRequest } from '../components/library-map/StudentLibraryView.tsx';
import { announcementHooks, BookStatus, bookHooks, genreHooks, isReadingRoomModel, rowLabel, sectionHooks } from '../api/resources.ts';
import type { Book, Section } from '../api/resources.ts';
import { tableHooks } from '../api/tables.ts';
import type { StudyTable } from '../api/tables.ts';
import { useReserveBook } from '../api/bookReservations.ts';
import { getErrorMessage } from '../lib/api.ts';
import { bookMatchesSearch } from '../lib/bookSearch.ts';

// What a reader needs to know, in plain words (a lost or damaged copy is simply not available).
const statusLabel: Record<BookStatus, string> = {
    [BookStatus.Available]: 'Available now',
    [BookStatus.Borrowed]: 'On loan',
    [BookStatus.Reserved]: 'Reserved',
    [BookStatus.Lost]: 'Unavailable',
    [BookStatus.Damaged]: 'Unavailable',
    [BookStatus.ReturnPending]: 'Being returned',
};

const statusBadge: Record<BookStatus, string> = {
    [BookStatus.Available]: 'badge-success',
    [BookStatus.Borrowed]: 'badge-warning',
    [BookStatus.Reserved]: 'badge-info',
    [BookStatus.Lost]: 'badge-neutral',
    [BookStatus.Damaged]: 'badge-neutral',
    [BookStatus.ReturnPending]: 'badge-secondary',
};

// The 3D scene is heavy, so it loads only when this page is opened.
const StudentLibraryView = lazy(() =>
    import('../components/library-map/StudentLibraryView.tsx').then(module => ({
        default: module.StudentLibraryView,
    })),
);

type FindKind = FindTarget['kind'];

const kinds: { id: FindKind; label: string }[] = [
    { id: 'book', label: 'Books' },
    { id: 'table', label: 'Tables' },
    { id: 'room', label: 'Reading rooms' },
];

const matches = (search: string, ...texts: (string | null)[]) => {
    const needle = search.trim().toLowerCase();
    return needle === '' || texts.some(text => text?.toLowerCase().includes(needle));
};

export function StudentBooksPage() {
    const books = bookHooks.useList();
    const tables = tableHooks.useList();
    const sections = sectionHooks.useList();
    const genres = genreHooks.useList().data;
    const announcements = announcementHooks.useList().data;

    const [search, setSearch] = useState('');
    const [genreId, setGenreId] = useState('');
    const [availableOnly, setAvailableOnly] = useState(true);
    const [kind, setKind] = useState<FindKind>('book');
    const [selected, setSelected] = useState<{ kind: FindKind; id: string } | null>(null);
    const [walkRequest, setWalkRequest] = useState<WalkRequest | null>(null);
    const reserve = useReserveBook();
    const [reserved, setReserved] = useState<string>();
    const [reserveError, setReserveError] = useState<string>();

    // What the 3D view shows the way to.
    const target = useMemo<FindTarget | null>(() => {
        if (!selected) return null;
        if (selected.kind === 'book') {
            const book = (books.data ?? []).find(b => b.id === selected.id);
            return book ? { kind: 'book', book } : null;
        }
        if (selected.kind === 'table') {
            const table = (tables.data ?? []).find(t => t.id === selected.id);
            return table ? { kind: 'table', table } : null;
        }
        const room = (sections.data ?? []).find(r => r.id === selected.id);
        return room ? { kind: 'room', room } : null;
    }, [selected, books.data, tables.data, sections.data]);

    const showTheWay = (picked: FindKind, id: string) => {
        setSelected({ kind: picked, id });
        // On a phone the 3D view sits above the list; bring it into sight.
        document.getElementById('student-3d')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Same, and then walks the route through the library in first person.
    const walkThere = (picked: FindKind, id: string) => {
        showTheWay(picked, id);
        setWalkRequest(previous => ({ targetId: id, id: (previous?.id ?? 0) + 1 }));
    };

    const reserveBook = (book: Book) => {
        setReserved(undefined);
        setReserveError(undefined);
        reserve.mutate(book.id, {
            onSuccess: () => setReserved(book.title),
            onError: error => setReserveError(getErrorMessage(error)),
        });
    };

    const visible = useMemo(
        () =>
            (books.data ?? []).filter(
                book =>
                    bookMatchesSearch(book, search) &&
                    (!genreId || book.genreId === genreId) &&
                    (!availableOnly || book.status === BookStatus.Available),
            ),
        [books.data, search, genreId, availableOnly],
    );
    const availableCount = (books.data ?? []).filter(book => book.status === BookStatus.Available).length;

    // Notices for the whole library are for every reader; the newest few are enough here.
    const notices = (announcements ?? []).filter(a => a.floorId === null).slice(0, 3);

    return (
        <Page
            title="Find a book, table or room"
            description={
                kind !== 'book'
                    ? 'Find a reading-room table or a whole reading room, and walk there to see where it is.'
                    : books.data
                      ? `${availableCount} of ${books.data.length} books are on the shelves and ready to borrow.`
                      : 'Search the catalogue and see what is available.'
            }
        >
            {notices.length > 0 && (
                <section aria-label="Announcements" className="flex flex-col gap-2">
                    {notices.map(notice => (
                        <div key={notice.id} className="alert alert-info alert-soft items-start">
                            <div>
                                <div className="font-semibold">{notice.title}</div>
                                <RichText html={notice.body} className="text-sm" />
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {reserved && (
                <div role="status" className="alert alert-success alert-soft">
                    '{reserved}' is reserved for you.{' '}
                    <Link to="/student/my-books" className="link font-semibold">
                        See my books
                    </Link>
                </div>
            )}
            {reserveError && (
                <div role="alert" className="alert alert-error alert-soft">
                    {reserveError}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
                <div className="flex min-w-0 flex-col gap-4">
                    <div role="tablist" aria-label="What to find" className="tabs tabs-box w-fit">
                        {kinds.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                role="tab"
                                aria-selected={kind === option.id}
                                className={`tab ${kind === option.id ? 'tab-active' : ''}`}
                                onClick={() => setKind(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="search"
                            className="input w-full sm:w-80"
                            placeholder={
                                kind === 'book'
                                    ? 'Search by title, author or ISBN...'
                                    : kind === 'table'
                                      ? 'Search by table or room...'
                                      : 'Search by room or floor...'
                            }
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            aria-label={kind === 'book' ? 'Search books' : kind === 'table' ? 'Search tables' : 'Search reading rooms'}
                        />
                        {kind === 'book' && (
                        <>
                        <select
                            className="select w-full sm:w-52"
                            value={genreId}
                            onChange={event => setGenreId(event.target.value)}
                            aria-label="Genre"
                        >
                            <option value="">All genres</option>
                            {(genres ?? []).map(genre => (
                                <option key={genre.id} value={genre.id}>
                                    {genre.name}
                                </option>
                            ))}
                        </select>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="toggle toggle-sm toggle-success"
                                checked={availableOnly}
                                onChange={event => setAvailableOnly(event.target.checked)}
                            />
                            Only books I can borrow now
                        </label>
                        </>
                        )}
                    </div>

                    {kind === 'table' ? (
                        <PlaceList
                            loading={tables.isLoading || sections.isLoading}
                            empty="No tables match."
                            places={(tables.data ?? [])
                                .filter(table => table.isActive && matches(search, table.name, table.sectionName))
                                .map(table => placeOfTable(table, sections.data ?? []))}
                            selectedId={selected?.kind === 'table' ? selected.id : null}
                            onShowTheWay={id => showTheWay('table', id)}
                            onWalkThere={id => walkThere('table', id)}
                            reserveTo="/student/tables"
                            reserveLabel="Reserve a table"
                        />
                    ) : kind === 'room' ? (
                        <PlaceList
                            loading={tables.isLoading || sections.isLoading}
                            empty="No reading rooms match."
                            places={(sections.data ?? [])
                                .filter(section => isReadingRoomModel(section.model) && matches(search, section.name, section.floorName))
                                .map(room => placeOfRoom(room, tables.data ?? []))}
                            selectedId={selected?.kind === 'room' ? selected.id : null}
                            onShowTheWay={id => showTheWay('room', id)}
                            onWalkThere={id => walkThere('room', id)}
                            reserveTo="/student/rooms"
                            reserveLabel="Reserve a room"
                        />
                    ) : books.isError ? (
                        <div role="alert" className="alert alert-error alert-soft">
                            Could not load the books: {getErrorMessage(books.error)}
                        </div>
                    ) : books.isLoading ? (
                        <div className="flex justify-center p-10">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : visible.length === 0 ? (
                        <p className="p-6 text-center opacity-70">
                            No books match.
                            {availableOnly ? ' Turn off "Only books I can borrow now" to see every title.' : ''}
                        </p>
                    ) : (
                        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {visible.map(book => (
                                <li key={book.id}>
                                    <BookCard
                                        book={book}
                                        selected={selected?.kind === 'book' && book.id === selected.id}
                                        onShowTheWay={() => showTheWay('book', book.id)}
                                        onWalkThere={() => walkThere('book', book.id)}
                                        onReserve={() => reserveBook(book)}
                                        reserving={reserve.isPending && reserve.variables === book.id}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="order-first lg:order-none lg:sticky lg:top-20 lg:self-start">
                    <Suspense
                        fallback={
                            <div className="flex h-80 items-center justify-center">
                                <span className="loading loading-spinner loading-lg" />
                            </div>
                        }
                    >
                        <StudentLibraryView
                            books={books.data ?? []}
                            target={target}
                            onClearSelection={() => setSelected(null)}
                            walkRequest={walkRequest}
                        />
                    </Suspense>
                </div>
            </div>
        </Page>
    );
}

interface BookCardProps {
    book: Book;
    selected: boolean;
    onShowTheWay: () => void;
    onWalkThere: () => void;
    onReserve: () => void;
    reserving: boolean;
}

function BookCard({ book, selected, onShowTheWay, onWalkThere, onReserve, reserving }: BookCardProps) {
    const authors = book.authors.map(author => author.name).join(', ');
    const shelved = book.rows.length > 0;

    return (
        <article
            className={`card card-border h-full bg-base-100 ${selected ? 'border-primary ring-2 ring-primary/40' : ''}`}
        >
            <div className="card-body gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="card-title text-base">{book.title}</h2>
                    <span className={`badge shrink-0 ${statusBadge[book.status]}`}>{statusLabel[book.status]}</span>
                </div>
                <p className="text-sm opacity-70">
                    {authors || 'Unknown author'} · {book.genreName}
                </p>

                <div className="mt-1 text-sm">
                    {book.status === BookStatus.Available && shelved ? (
                        <>
                            <div className="text-xs font-semibold uppercase opacity-60">Find it at</div>
                            <ul>
                                {book.rows.map(row => (
                                    <li key={row.id}>{rowLabel(row)}</li>
                                ))}
                            </ul>
                        </>
                    ) : book.status === BookStatus.Available ? (
                        <span className="opacity-70">Not on a shelf right now. Ask at the librarian's desk.</span>
                    ) : (
                        <span className="opacity-70">Not on the shelf at the moment.</span>
                    )}
                </div>

                {book.status === BookStatus.Available && (
                    <div className="card-actions mt-2 justify-end">
                        {shelved && (
                            <>
                                <button type="button" className="btn btn-outline btn-sm" onClick={onShowTheWay}>
                                    {selected ? 'Showing the way' : 'Show me the way'}
                                </button>
                                <button type="button" className="btn btn-outline btn-secondary btn-sm" onClick={onWalkThere}>
                                    Walk there
                                </button>
                            </>
                        )}
                        <button type="button" className="btn btn-primary btn-sm" disabled={reserving} onClick={onReserve}>
                            Reserve
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

interface Place {
    id: string;
    title: string;
    detail: string;
    /** True when it is in a reading room, so there is somewhere to walk to. */
    inRoom: boolean;
}

function placeOfTable(table: StudyTable, sections: Section[]): Place {
    const room = sections.find(section => section.id === table.sectionId);
    return {
        id: table.id,
        title: table.name,
        detail: `${table.seats} seats · ${room ? `${room.name}, ${room.floorName}` : 'not in a reading room'}`,
        inRoom: !!room,
    };
}

function placeOfRoom(room: Section, tables: StudyTable[]): Place {
    const inRoom = tables.filter(table => table.isActive && table.sectionId === room.id);
    const seats = inRoom.reduce((total, table) => total + table.seats, 0);
    return { id: room.id, title: room.name, detail: `${room.floorName} · ${inRoom.length} tables, ${seats} seats`, inRoom: true };
}

interface PlaceListProps {
    loading: boolean;
    empty: string;
    places: Place[];
    selectedId: string | null;
    onShowTheWay: (id: string) => void;
    onWalkThere: (id: string) => void;
    reserveTo: string;
    reserveLabel: string;
}

/** Tables or reading rooms, each with the way to it. */
function PlaceList({ loading, empty, places, selectedId, onShowTheWay, onWalkThere, reserveTo, reserveLabel }: PlaceListProps) {
    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <span className="loading loading-spinner loading-lg" />
            </div>
        );
    }
    if (places.length === 0) return <p className="p-6 text-center opacity-70">{empty}</p>;

    return (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {places.map(place => (
                <li key={place.id}>
                    <article
                        className={`card card-border h-full bg-base-100 ${place.id === selectedId ? 'border-primary ring-2 ring-primary/40' : ''}`}
                    >
                        <div className="card-body gap-2">
                            <h2 className="card-title text-base">{place.title}</h2>
                            <p className="text-sm opacity-70">{place.detail}</p>
                            <div className="card-actions mt-2 justify-end">
                                {place.inRoom && (
                                    <>
                                        <button type="button" className="btn btn-outline btn-sm" onClick={() => onShowTheWay(place.id)}>
                                            {place.id === selectedId ? 'Showing the way' : 'Show me the way'}
                                        </button>
                                        <button type="button" className="btn btn-outline btn-secondary btn-sm" onClick={() => onWalkThere(place.id)}>
                                            Walk there
                                        </button>
                                    </>
                                )}
                                <Link to={reserveTo} className="btn btn-primary btn-sm">
                                    {reserveLabel}
                                </Link>
                            </div>
                        </div>
                    </article>
                </li>
            ))}
        </ul>
    );
}
